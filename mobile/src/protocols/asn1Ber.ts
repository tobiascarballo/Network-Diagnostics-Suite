import { Buffer } from 'buffer';

export const BER_TAGS = {
  INTEGER: 0x02,
  OCTET_STRING: 0x04,
  NULL: 0x05,
  OBJECT_IDENTIFIER: 0x06,
  SEQUENCE: 0x30,
  GET_REQUEST: 0xa0,
  GET_RESPONSE: 0xa2,
  COUNTER32: 0x41,
  GAUGE32: 0x42,
  TIMETICKS: 0x43,
};

/**
 * Codifica una longitud según reglas BER (ASN.1)
 */
export function encodeLength(len: number): number[] {
  if (len < 128) {
    return [len];
  }
  const bytes: number[] = [];
  let temp = len;
  while (temp > 0) {
    bytes.unshift(temp & 0xff);
    temp >>= 8;
  }
  bytes.unshift(0x80 | bytes.length);
  return bytes;
}

/**
 * Codifica un entero según BER
 */
export function encodeInteger(val: number): number[] {
  const bytes: number[] = [];
  let temp = val;
  if (temp === 0) {
    bytes.push(0);
  } else {
    while (temp > 0) {
      bytes.unshift(temp & 0xff);
      temp >>= 8;
    }
    // Si el bit más significativo es 1, agregar 0x00 para evitar que sea interpretado como negativo
    if (bytes[0] & 0x80) {
      bytes.unshift(0x00);
    }
  }
  return [BER_TAGS.INTEGER, ...encodeLength(bytes.length), ...bytes];
}

/**
 * Codifica una cadena de texto (OCTET STRING)
 */
export function encodeOctetString(str: string): number[] {
  const bytes = Array.from(Buffer.from(str, 'utf8'));
  return [BER_TAGS.OCTET_STRING, ...encodeLength(bytes.length), ...bytes];
}

/**
 * Codifica un OID estándar (ej: "1.3.6.1.2.1.1.5.0")
 */
export function encodeOid(oidStr: string): number[] {
  const parts = oidStr.split('.').map(p => parseInt(p, 10));
  if (parts.length < 2) return [];

  const bytes: number[] = [parts[0] * 40 + parts[1]];

  for (let i = 2; i < parts.length; i++) {
    let val = parts[i];
    if (val < 128) {
      bytes.push(val);
    } else {
      const subBytes: number[] = [];
      subBytes.push(val & 0x7f);
      val >>= 7;
      while (val > 0) {
        subBytes.unshift((val & 0x7f) | 0x80);
        val >>= 7;
      }
      bytes.push(...subBytes);
    }
  }

  return [BER_TAGS.OBJECT_IDENTIFIER, ...encodeLength(bytes.length), ...bytes];
}

/**
 * Codifica una secuencia (SEQUENCE) envolviendo contenido
 */
export function encodeSequence(content: number[]): number[] {
  return [BER_TAGS.SEQUENCE, ...encodeLength(content.length), ...content];
}

/**
 * Construye una trama binaria PDU SNMP v1/v2c GetRequest completa
 */
export function buildSnmpGetRequest(
  community: string,
  oids: string[],
  requestId: number = 1001
): Buffer {
  // Construir VarBindList
  const varBindsBytes: number[] = [];
  for (const oid of oids) {
    const oidBytes = encodeOid(oid);
    const nullVal = [BER_TAGS.NULL, 0x00];
    const singleVarBind = encodeSequence([...oidBytes, ...nullVal]);
    varBindsBytes.push(...singleVarBind);
  }
  const varBindList = encodeSequence(varBindsBytes);

  // SNMP PDU: GetRequest (0xa0)
  // RequestID, ErrorStatus (0), ErrorIndex (0), VarBindList
  const reqIdBytes = encodeInteger(requestId);
  const errorStatus = encodeInteger(0);
  const errorIndex = encodeInteger(0);

  const pduContent = [...reqIdBytes, ...errorStatus, ...errorIndex, ...varBindList];
  const pdu = [BER_TAGS.GET_REQUEST, ...encodeLength(pduContent.length), ...pduContent];

  // SNMP Message: Sequence { Version (0x01 para v2c), Community, PDU }
  const version = encodeInteger(1); // 1 = SNMPv2c (0 = SNMPv1)
  const comm = encodeOctetString(community);

  const messageContent = [...version, ...comm, ...pdu];
  const snmpMessage = encodeSequence(messageContent);

  return Buffer.from(snmpMessage);
}

/**
 * Decodifica una longitud BER
 */
function decodeLength(buf: Buffer, offset: number): { len: number; nextOffset: number } {
  const first = buf[offset];
  if ((first & 0x80) === 0) {
    return { len: first, nextOffset: offset + 1 };
  }
  const numOctets = first & 0x7f;
  let len = 0;
  for (let i = 0; i < numOctets; i++) {
    len = (len << 8) | buf[offset + 1 + i];
  }
  return { len, nextOffset: offset + 1 + numOctets };
}

/**
 * Decodifica un OID en string
 */
function decodeOid(buf: Buffer, offset: number, length: number): string {
  if (length === 0) return '';
  const first = buf[offset];
  const parts: number[] = [Math.floor(first / 40), first % 40];

  let current = 0;
  for (let i = 1; i < length; i++) {
    const byte = buf[offset + i];
    current = (current << 7) | (byte & 0x7f);
    if ((byte & 0x80) === 0) {
      parts.push(current);
      current = 0;
    }
  }
  return parts.join('.');
}

/**
 * Parser BER/ASN.1 simplificado para respuestas SNMP GetResponse
 */
export function parseSnmpResponse(buf: Buffer): {
  version: number;
  community: string;
  varBinds: { oid: string; value: any }[];
} {
  try {
    let offset = 0;
    if (buf[offset] !== BER_TAGS.SEQUENCE) {
      throw new Error('No es una secuencia SNMP válida');
    }
    offset++;
    const seqLen = decodeLength(buf, offset);
    offset = seqLen.nextOffset;

    // Versión
    if (buf[offset] !== BER_TAGS.INTEGER) throw new Error('Versión no encontrada');
    offset++;
    const vLen = decodeLength(buf, offset);
    offset = vLen.nextOffset;
    const version = buf[offset];
    offset += vLen.len;

    // Community string
    if (buf[offset] !== BER_TAGS.OCTET_STRING) throw new Error('Community string inválido');
    offset++;
    const cLen = decodeLength(buf, offset);
    offset = cLen.nextOffset;
    const community = buf.slice(offset, offset + cLen.len).toString('utf8');
    offset += cLen.len;

    // PDU (Get-Response = 0xa2)
    const pduTag = buf[offset];
    if (pduTag !== BER_TAGS.GET_RESPONSE && pduTag !== 0xa0) {
      throw new Error(`PDU inesperado: 0x${pduTag.toString(16)}`);
    }
    offset++;
    const pduLen = decodeLength(buf, offset);
    offset = pduLen.nextOffset;

    // Request ID
    offset++;
    const reqLen = decodeLength(buf, offset);
    offset = reqLen.nextOffset + reqLen.len;

    // Error Status & Error Index
    offset++;
    const errSLen = decodeLength(buf, offset);
    offset = errSLen.nextOffset + errSLen.len;

    offset++;
    const errILen = decodeLength(buf, offset);
    offset = errILen.nextOffset + errILen.len;

    // VarBindList Sequence
    if (buf[offset] !== BER_TAGS.SEQUENCE) throw new Error('VarBindList no encontrada');
    offset++;
    const vbListLen = decodeLength(buf, offset);
    offset = vbListLen.nextOffset;
    const endVbList = offset + vbListLen.len;

    const varBinds: { oid: string; value: any }[] = [];

    while (offset < endVbList && offset < buf.length) {
      if (buf[offset] !== BER_TAGS.SEQUENCE) break;
      offset++;
      const singleVbLen = decodeLength(buf, offset);
      offset = singleVbLen.nextOffset;
      const endSingleVb = offset + singleVbLen.len;

      // OID
      if (buf[offset] !== BER_TAGS.OBJECT_IDENTIFIER) break;
      offset++;
      const oidLen = decodeLength(buf, offset);
      offset = oidLen.nextOffset;
      const oid = decodeOid(buf, offset, oidLen.len);
      offset += oidLen.len;

      // Value (Integer, String, Counter, etc.)
      const valTag = buf[offset];
      offset++;
      const valLen = decodeLength(buf, offset);
      offset = valLen.nextOffset;

      let value: any = null;
      if (valTag === BER_TAGS.OCTET_STRING) {
        value = buf.slice(offset, offset + valLen.len).toString('utf8');
      } else if (
        valTag === BER_TAGS.INTEGER ||
        valTag === BER_TAGS.COUNTER32 ||
        valTag === BER_TAGS.GAUGE32 ||
        valTag === BER_TAGS.TIMETICKS
      ) {
        let num = 0;
        for (let i = 0; i < valLen.len; i++) {
          num = (num << 8) | buf[offset + i];
        }
        value = num;
      } else {
        value = buf.slice(offset, offset + valLen.len).toString('hex');
      }

      varBinds.push({ oid, value });
      offset = endSingleVb;
    }

    return { version, community, varBinds };
  } catch (err: any) {
    return { version: 1, community: '', varBinds: [] };
  }
}
