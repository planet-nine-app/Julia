import config from '../../config/local.js';
import { createClient } from 'redis';
import sessionless from 'sessionless-node';
  
const client = await createClient()
  .on('error', err => console.log('Redis Client Error', err))
  .connect();
    
const db = {
  getUser: async (uuid) => {
    const user = await client.get(`user:${uuid}`);
    const parsedUser = JSON.parse(user);
    return parsedUser; 
  },

  putUser: async (pubKey, user) => {
    const uuid = sessionless.generateUUID();
    user.uuid = uuid;
    await client.set(`user:${uuid}`, JSON.stringify(user));
    return uuid;
  },

  saveUser: async (user) => {
    await client.set(`user:${user.uuid}`, JSON.stringify(user));
    return true;
  },

  deleteUser: async (user) => {
    const resp = await client.sendCommand(['DEL', `user:${user.uuid}`]);

    return true;
  },

  startPrompt: async (user, prompt) => {
    await client.set(`prompt:${prompt}`, JSON.stringify({timestamp: new Date().getTime(), prompter: user.uuid}));

    return true;
  },

  savePrompt: async (user, savedPrompt) => {
    const currentPromptString = await client.get(`prompt:${savedPrompt.prompt}`);
    const currentPrompt = JSON.parse(currentPromptString);
    const now = new Date().getTime();

    if(now - +currentPrompt.timestamp < config.promptTimeLimit) {
      await client.sendCommand(['DEL', `prompt:${savedPrompt.prompt}`]);
      return false;
    }

    if(!currentPrompt) {
      return false;
    }

    currentPrompt.newTimestamp = savedPrompt.timestamp;
    currentPrompt.newUUID = savedPrompt.uuid;
    currentPrompt.newPubKey = savedPrompt.pubKey;

    await client.set(`prompt:${prompt}`, JSON.stringify(currentPrompt));
  },

  associateUsers: async (user, associatedUser) => {
    user.keys.interactingKeys[associatedUser.uuid] = associatedUser.pubKey;
    associatedUser.keys.interactingKeys[user.uuid] = user.pubKey;

    const saved = (await db.saveUser(user) && await db.saveUser(associatedUser));
    return user;
  },

  deleteAssociation: async (user, associatedUser) => {
    delete user.keys.interactingKeys[associatedUser.uuid];
    delete associatedUser.keys.interactingKeys[user.uuid];

    return true;
  },

  messageUser: async (sender, receiver, message) => {
    await client.sendCommand(['SADD', `${sender.uuid}:messages`, message]);
    await client.sendCommand(['SADD', `${receiver.uuid}:messages`, message]);

    return true;
  },

  getMessages: async (user) => {
    const messages = await client.sendCommand(['SMEMBERS', `${user.uuid}:messages`]);
    
    return messages;
  }
};

export default db;
