import sessionless from 'sessionless-node';
import fetch from 'node-fetch';

const get = async (url) => {
  return await fetch(url);
};

const post = async (url, payload) => {
  return await fetch(url, {
    method: 'post',
    body: JSON.stringify(payload),
    headers: {'Content-Type': 'application/json'}
  });
};

const put = async (url, payload) => {
  return await fetch(url, {
    method: 'put',
    body: JSON.stringify(payload),
    headers: {'Content-Type': 'application/json'}
  });
};

const _delete = async (url, payload) => {
  return await fetch(url, {
    method: 'delete',
    body: JSON.stringify(payload),
    headers: {'Content-Type': 'application/json'}
  });
};

const julia = {
  baseURL: 'https://dev.julia.allyabase.com/',

  createUser: async (saveKeys, getKeys, optionalUser) => {
    const keys = (await getKeys()) || (await sessionless.generateKeys(saveKeys, getKeys))
    sessionless.getKeys = getKeys;

    const payload = {
      timestamp: new Date().getTime() + '',
      pubKey: keys.pubKey,
      user: optionalUser || { pubKey: keys.pubKey }
    };

    payload.signature = await sessionless.sign(payload.timestamp + payload.pubKey);

    const res = await put(`${julia.baseURL}user/create`, payload);
    const user = await res.json();

    return user;
  },

  getUser: async (uuid) => {
    const timestamp = new Date().getTime() + '';
    
    const message = timestamp + uuid;
    
    const signature = await sessionless.sign(message);

    const res = await get(`${julia.baseURL}user/${uuid}?timestamp=${timestamp}&signature=${signature}`);
    const user = res.json();

    return user;
  },

  getPrompt: async (uuid) => {
    const timestamp = new Date().getTime() + '';

    const message = timestamp + uuid;

    const signature = await sessionless.sign(message);

    const res = await get(`${julia.baseURL}user/${uuid}/associate/prompt?signature=${signature}&timestamp=${timestamp}`);
    const user = await res.json();
    return user;
  },

  signPrompt: async (uuid, prompt) => {
    const pubKey = (await sessionless.getKeys()).pubKey;
    const payload = {
      timestamp: new Date().getTime(),
      uuid,
      pubKey,
      prompt
    };

    const message = payload.timestamp + payload.uuid + payload.pubKey + payload.prompt;
    payload.signature = await sessionless.sign(message);

    const res = await post(`${julia.baseURL}user/${uuid}/associate/signedPrompt`, payload);
    const body = await res.json();
    return body.success;
  },

  associate: async (uuid, signedPrompt) => {
    const payload = {
      timestamp: new Date().getTime() + '',
      newTimestamp: signedPrompt.newTimestamp,
      newUUID: signedPrompt.newUUID,
      newPubKey: signedPrompt.newPubKey,
      prompt: signedPrompt.prompt,
      newSignature: signedPrompt.newSignature
   };

console.log(payload.prompt);
    const message = payload.newTimestamp + payload.newUUID + payload.newPubKey + payload.prompt;
console.log('message looks like: ', message);

    payload.signature = await sessionless.sign(message);

    const res = await post(`${julia.baseURL}user/${uuid}/associate`, payload);
    const user = await res.json();
    return user;
  },

  deleteKey: async (uuid, associatedUUID) => {
    const timestamp = new Date().getTime() + '';
    const message = timestamp + associatedUUID + uuid;
    const signature = await sessionless.sign(message);

    const payload = {
      timestamp,
      signature
    };

    const res = await _delete(`${julia.baseURL}associated/${associatedUUID}/user/${uuid}`, payload);
    const user = await res.json();
    return user;
  },

  postMessage: async (uuid, receiverUUID, contents) => {
    const payload = {
      timestamp: new Date().getTime() + '',
      senderUUID: uuid,
      receiverUUID: receiverUUID,
      message: contents
    };

    const message = payload.timestamp + payload.senderUUID + payload.receiverUUID + payload.message;
    payload.signature = await sessionless.sign(message);

    const res = await post(`${julia.baseURL}message`, payload);
    const body = await res.json();
    return body.success;
  },

  getMessages: async (uuid) => {
    const timestamp = new Date().getTime() + '';
    
    const message = timestamp + uuid;
   
    const signature = await sessionless.sign(message);

    const res = await get(`${julia.baseURL}messages/user/${uuid}?timestamp=${timestamp}&signature=${signature}`);
    const messages = (await res.json()).messages;
    return messages;
  },

  deleteUser: async (uuid) => {
    const timestamp = new Date().getTime() + '';

    const signature = await sessionless.sign(timestamp + uuid);
    const payload = {timestamp, uuid, signature};


    const res = await _delete(`${julia.baseURL}user/${uuid}`, payload);
    return res.status === 200;
  }
};

export default julia;
