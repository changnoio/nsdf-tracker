/* Staff data and private weekly changes share an authenticated encryption key. */
(function(scope) {
  'use strict';
  const utf8 = new TextEncoder();
  const bytes = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
  const encode = value => {
    let result = '';
    for (let i = 0; i < value.length; i += 16384) result += String.fromCharCode(...value.subarray(i, i + 16384));
    return btoa(result);
  };
  async function open(key, packet) {
    const raw = await crypto.subtle.decrypt({name:'AES-GCM', iv:bytes(packet.iv)}, key, bytes(packet.sealed));
    return JSON.parse(new TextDecoder().decode(raw));
  }
  async function seal(key, value) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const raw = await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, utf8.encode(JSON.stringify(value)));
    return {iv:encode(iv), sealed:encode(new Uint8Array(raw))};
  }
  async function fromToken(token) {
    const key = await crypto.subtle.importKey('raw', bytes(token), 'AES-GCM', false, ['encrypt','decrypt']);
    const content = await open(key, scope.NSDF_STAFF);
    return {key, token, content};
  }
  async function signIn(name, password) {
    if (name !== 'admin' || !password) throw Error('invalid credentials');
    const auth = await crypto.subtle.importKey('raw', utf8.encode(password), 'PBKDF2', false, ['deriveBits']);
    const packet = scope.NSDF_STAFF;
    const bits = await crypto.subtle.deriveBits({name:'PBKDF2', hash:'SHA-256', iterations:packet.iterations, salt:bytes(packet.salt)}, auth, 256);
    return fromToken(encode(new Uint8Array(bits)));
  }
  function staffBase(publicData, staff) {
    return {...publicData, plans:[...publicData.plans,staff.plan], procurement:staff.procurement,
      ledger:staff.ledger, sources:{...publicData.sources,...staff.sources}};
  }
  scope.NSDFAccess = {signIn,fromToken,staffBase,open,seal,bytes};
})(globalThis);
