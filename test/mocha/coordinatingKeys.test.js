import sessionless from 'sessionless-node';
import superAgent from 'superagent';
import { expect } from 'chai';
import { secp256k1 } from 'ethereum-cryptography/secp256k1';
import { keccak256 } from "ethereum-cryptography/keccak.js";
import { bytesToHex } from "ethereum-cryptography/utils.js";
import { utf8ToBytes } from "ethereum-cryptography/utils.js";

const baseURL = 'http://127.0.0.1:5111/';

// Helper function to sign a message with a specific private key
const signWithKey = (message, privateKey) => {
  const messageHash = keccak256(utf8ToBytes(message));
  const signatureAsBigInts = secp256k1.sign(messageHash, privateKey);
  const signature = signatureAsBigInts.toCompactHex();
  return signature;
};

const put = async (url, payload) => {
  return await superAgent.put(url).send(payload);
};

const post = async (url, payload) => {
  return await superAgent.post(url).send(payload);
};

const get = async (url) => {
  return await superAgent.get(url);
};

describe('Julia CoordinatingKeys Tests', () => {
  let primaryUser = {};
  let primaryKeys = {};
  let primaryKeysToReturn = {};

  let backupUser1 = {};
  let backupKeys1 = {};
  let backupKeysToReturn1 = {};

  let backupUser2 = {};
  let backupKeys2 = {};
  let backupKeysToReturn2 = {};

  let backupUser3 = {};
  let backupKeys3 = {};
  let backupKeysToReturn3 = {};

  let backupUser4 = {};
  let backupKeys4 = {};
  let backupKeysToReturn4 = {};

  it('should create primary user', async () => {
    primaryKeys = await sessionless.generateKeys(
      (k) => { primaryKeysToReturn = k; },
      () => { return primaryKeysToReturn; }
    );

    const payload = {
      timestamp: new Date().getTime() + '',
      pubKey: primaryKeys.pubKey,
      user: { handle: 'primaryUser', pubKey: primaryKeys.pubKey }
    };

    payload.signature = await sessionless.sign(payload.timestamp + payload.pubKey);
    const res = await put(`${baseURL}user/create`, payload);

    expect(res.status).to.equal(200);
    primaryUser = res.body;
    expect(primaryUser).to.have.property('uuid');
    expect(primaryUser).to.have.property('keys');
    expect(primaryUser.keys).to.have.property('coordinatingKeys');
  });

  it('should create backup user 1', async () => {
    backupKeys1 = await sessionless.generateKeys(
      (k) => { backupKeysToReturn1 = k; },
      () => { return backupKeysToReturn1; }
    );

    const payload = {
      timestamp: new Date().getTime() + '',
      pubKey: backupKeys1.pubKey,
      user: { handle: 'backupUser1', pubKey: backupKeys1.pubKey }
    };

    payload.signature = await sessionless.sign(payload.timestamp + payload.pubKey);
    const res = await put(`${baseURL}user/create`, payload);

    expect(res.status).to.equal(200);
    backupUser1 = res.body;
    expect(backupUser1).to.have.property('uuid');
  });

  it('should create backup user 2', async () => {
    backupKeys2 = await sessionless.generateKeys(
      (k) => { backupKeysToReturn2 = k; },
      () => { return backupKeysToReturn2; }
    );

    const payload = {
      timestamp: new Date().getTime() + '',
      pubKey: backupKeys2.pubKey,
      user: { handle: 'backupUser2', pubKey: backupKeys2.pubKey }
    };

    payload.signature = await sessionless.sign(payload.timestamp + payload.pubKey);
    const res = await put(`${baseURL}user/create`, payload);

    expect(res.status).to.equal(200);
    backupUser2 = res.body;
    expect(backupUser2).to.have.property('uuid');
  });

  it('should create backup user 3', async () => {
    backupKeys3 = await sessionless.generateKeys(
      (k) => { backupKeysToReturn3 = k; },
      () => { return backupKeysToReturn3; }
    );

    const payload = {
      timestamp: new Date().getTime() + '',
      pubKey: backupKeys3.pubKey,
      user: { handle: 'backupUser3', pubKey: backupKeys3.pubKey }
    };

    payload.signature = await sessionless.sign(payload.timestamp + payload.pubKey);
    const res = await put(`${baseURL}user/create`, payload);

    expect(res.status).to.equal(200);
    backupUser3 = res.body;
    expect(backupUser3).to.have.property('uuid');
  });

  it('should create backup user 4', async () => {
    backupKeys4 = await sessionless.generateKeys(
      (k) => { backupKeysToReturn4 = k; },
      () => { return backupKeysToReturn4; }
    );

    const payload = {
      timestamp: new Date().getTime() + '',
      pubKey: backupKeys4.pubKey,
      user: { handle: 'backupUser4', pubKey: backupKeys4.pubKey }
    };

    payload.signature = await sessionless.sign(payload.timestamp + payload.pubKey);
    const res = await put(`${baseURL}user/create`, payload);

    expect(res.status).to.equal(200);
    backupUser4 = res.body;
    expect(backupUser4).to.have.property('uuid');
  });

  it('should coordinate backup key 1 with primary user', async () => {
    const timestamp = new Date().getTime() + '';
    const message = timestamp + primaryUser.uuid + backupKeys1.pubKey + backupUser1.uuid;

    const signature = signWithKey(message, backupKeys1.privateKey);
    console.log('Verifying locally:', sessionless.verifySignature(signature, message, backupKeys1.pubKey));

    const payload = {
      timestamp,
      pubKey: backupKeys1.pubKey,
      uuid: backupUser1.uuid,
      signature
    };

    const res = await post(`${baseURL}user/${primaryUser.uuid}/coordinate`, payload);

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('success', true);
    expect(res.body).to.have.property('coordinatingKeys');
    expect(res.body.coordinatingKeys).to.have.property(backupUser1.uuid, backupKeys1.pubKey);
  });

  it('should coordinate backup key 2 with primary user', async () => {
    const timestamp = new Date().getTime() + '';
    const message = timestamp + primaryUser.uuid + backupKeys2.pubKey + backupUser2.uuid;

    const signature = signWithKey(message, backupKeys2.privateKey);
    console.log('Verifying locally:', sessionless.verifySignature(signature, message, backupKeys2.pubKey));

    const payload = {
      timestamp,
      pubKey: backupKeys2.pubKey,
      uuid: backupUser2.uuid,
      signature
    };

    const res = await post(`${baseURL}user/${primaryUser.uuid}/coordinate`, payload);

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('success', true);
    expect(res.body.coordinatingKeys).to.have.property(backupUser2.uuid, backupKeys2.pubKey);
  });

  it('should coordinate backup key 3 with primary user', async () => {
    const timestamp = new Date().getTime() + '';
    const message = timestamp + primaryUser.uuid + backupKeys3.pubKey + backupUser3.uuid;

    const signature = signWithKey(message, backupKeys3.privateKey);
    console.log('Verifying locally:', sessionless.verifySignature(signature, message, backupKeys3.pubKey));

    const payload = {
      timestamp,
      pubKey: backupKeys3.pubKey,
      uuid: backupUser3.uuid,
      signature
    };

    const res = await post(`${baseURL}user/${primaryUser.uuid}/coordinate`, payload);

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('success', true);
    expect(res.body.coordinatingKeys).to.have.property(backupUser3.uuid, backupKeys3.pubKey);
  });

  it('should coordinate backup key 4 with primary user', async () => {
    const timestamp = new Date().getTime() + '';
    const message = timestamp + primaryUser.uuid + backupKeys4.pubKey + backupUser4.uuid;

    const signature = signWithKey(message, backupKeys4.privateKey);
    console.log('Verifying locally:', sessionless.verifySignature(signature, message, backupKeys4.pubKey));

    const payload = {
      timestamp,
      pubKey: backupKeys4.pubKey,
      uuid: backupUser4.uuid,
      signature
    };

    const res = await post(`${baseURL}user/${primaryUser.uuid}/coordinate`, payload);

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('success', true);
    expect(res.body.coordinatingKeys).to.have.property(backupUser4.uuid, backupKeys4.pubKey);
  });

  it('should retrieve primary user with all 4 coordinating keys', async () => {
    const timestamp = new Date().getTime() + '';
    const message = timestamp + primaryUser.uuid;

    const signature = signWithKey(message, primaryKeys.privateKey);

    const res = await get(`${baseURL}user/${primaryUser.uuid}?timestamp=${timestamp}&signature=${signature}`);

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('keys');
    expect(res.body.keys).to.have.property('coordinatingKeys');

    const coordinatingKeys = res.body.keys.coordinatingKeys;
    expect(Object.keys(coordinatingKeys).length).to.equal(4);

    expect(coordinatingKeys).to.have.property(backupUser1.uuid, backupKeys1.pubKey);
    expect(coordinatingKeys).to.have.property(backupUser2.uuid, backupKeys2.pubKey);
    expect(coordinatingKeys).to.have.property(backupUser3.uuid, backupKeys3.pubKey);
    expect(coordinatingKeys).to.have.property(backupUser4.uuid, backupKeys4.pubKey);
  });

  it('should reject coordinating key with invalid signature', async () => {
    const timestamp = new Date().getTime() + '';
    const message = timestamp + primaryUser.uuid + backupKeys1.pubKey + backupUser1.uuid;

    const payload = {
      timestamp,
      pubKey: backupKeys1.pubKey,
      uuid: backupUser1.uuid,
      signature: 'invalid_signature'
    };

    const res = await post(`${baseURL}user/${primaryUser.uuid}/coordinate`, payload).catch(err => err.response);

    expect(res.status).to.equal(403);
    expect(res.body).to.have.property('error', 'auth error');
  });
});
