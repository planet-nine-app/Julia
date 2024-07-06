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

  associateUsers: async (user, associatedUser) => {
    user.keys.interactingKeys[associatedUser.uuid] = associatedUser.pubKey;
    associatedUser.keys.interactingKeys[user.uuid] = user.pubKey;

    return (await db.saveUser(user) && await db.saveUser(associatedUser));
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
