import config from '../../config/local.js';
import { createClient } from 'redis';
import sessionless from 'sessionless-node';
  
const client = await createClient()
  .on('error', err => console.log('Redis Client Error', err))
  .connect();
    
const db = {
  getUser: async (uuid) => {
    const user = await client.get(`user:${uuid}`);
    let parsedUser = JSON.parse(user);
console.log(`parsedUser: ${JSON.stringify(parsedUser)}`);
console.log(uuid);
    const currentKeys = await sessionless.getKeys();
if(!parsedUser) {
  parsedUser = {uuid};
  parsedUser.keys = { // This should only be the case for Julia until I update how that works.
    interactingKeys: {},
    coordinatingKeys: {}
  };
}
    parsedUser.keys.interactingKeys.julia = currentKeys.pubKey;
    parsedUser.pendingPrompts = await db.getPendingPrompts(parsedUser);
//console.log(`pendingPrompts: ${JSON.stringify(parsedUser.pendingPrompts)}`);
    parsedUser.messages = await db.getMessages(parsedUser);
console.log('messages: ', parsedUser.messages);
    return parsedUser; 
  },

  putUser: async (user) => {
    const uuid = sessionless.generateUUID();
    user.uuid = uuid;
    user.keys = {
      interactingKeys: {},
      coordinatingKeys: {}
    };
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
    const promptToAdd = {
      timestamp: new Date().getTime() + '', 
      prompter: user.uuid,
      prompt
    };

    await client.set(`prompt:${prompt}`, JSON.stringify(promptToAdd));
    await client.sendCommand(['SADD', `prompt:${user.uuid}`, `prompt:${prompt}`]);

    const pendingPrompts = await db.getPendingPrompts(user);
    pendingPrompts[prompt] = promptToAdd;

console.log('pendingPrompts', pendingPrompts);

    return pendingPrompts;
  },

  saveSignedPrompt: async (user, saveSignedPrompt) => {
    const currentPromptString = await client.get(`prompt:${saveSignedPrompt.prompt}`);
    if(!currentPromptString) {
console.log('no prompt');
      return false;
    }
    const currentPrompt = JSON.parse(currentPromptString);
    const now = new Date().getTime();

    if(now - +currentPrompt.timestamp > config.promptTimeLimit) {
console.log('timestamp isn\'t good anymore');
      await client.sendCommand(['SREM', `prompt:${user.uuid}`, `prompt:${prompt}`]);
      await client.sendCommand(['DEL', `prompt:${saveSignedPrompt.prompt}`]);
      return false;
    }

    if(!currentPrompt) {
      return false;
    }

    currentPrompt.newTimestamp = saveSignedPrompt.timestamp;
    currentPrompt.newUUID = saveSignedPrompt.uuid;
console.log('uuid on currentPrompt is: ' + currentPrompt.newUUID);
    currentPrompt.newPubKey = saveSignedPrompt.pubKey;
    currentPrompt.prompt = saveSignedPrompt.prompt;
    currentPrompt.newSignature = saveSignedPrompt.signature;

    await client.set(`prompt:${saveSignedPrompt.prompt}`, JSON.stringify(currentPrompt));
    
    return true;
  },

  getPendingPrompts: async (user) => {
    const promptKeys = await client.sendCommand(['SMEMBERS', `prompt:${user.uuid}`]);
    let prompts = {};
    for(let i = 0; i < promptKeys.length; i++) {
/*      const prompt = promptKeys[i].split(':')[1];
      await client.sendCommand(['SREM', `prompt:${user.uuid}`, `prompt:${prompt}`]);
      await client.sendCommand(['DEL', `prompt:${prompt}`]);
*/      const prompt = await client.get(promptKeys[i]);
      if(!prompt) {
        await client.sendCommand(['SREM', `prompt:${user.uuid}`, `prompt:${prompt}`]); 
        continue;
      }
      const parsedPrompt = JSON.parse(prompt); 
      if(parsedPrompt.newPubKey) {
        prompts[parsedPrompt.prompt] = parsedPrompt;
      }
    }

    return prompts;
  },

  associateUsers: async (user, associatedUser) => {
    user.keys.interactingKeys[associatedUser.uuid] = associatedUser.pubKey;
    associatedUser.keys.interactingKeys[user.uuid] = user.pubKey;

    const saved = (await db.saveUser(user) && await db.saveUser(associatedUser));
    return user;
  },

  removePrompt: async (user, prompt) => {
    await client.sendCommand(['SREM', `prompt:${user.uuid}`, `prompt:${prompt}`]); 
    await client.sendCommand(['DEL', `prompt:${prompt}`]);
    
  },

  deleteAssociation: async (user, associatedUser) => {
    delete user.keys.interactingKeys[associatedUser.uuid];
    delete associatedUser.keys.interactingKeys[user.uuid];

    await db.saveUser(user);
    await db.saveUser(associatedUser);

    return true;
  },

  messageUser: async (sender, receiver, message) => {
    const messageJSON = JSON.stringify(message);
    await client.sendCommand(['SADD', `${sender.uuid}:messages`, messageJSON]);
    await client.sendCommand(['SADD', `${receiver.uuid}:messages`, messageJSON]);

    return true;
  },

  getMessages: async (user) => {
    let messages = await client.sendCommand(['SMEMBERS', `${user.uuid}:messages`]);
console.log(messages);
    
    if(!messages || messages.length === 0) {
      return [];
    }

    if(messages[0] !== '[') {
      messages = `[${messages}]`;
    }

    const parsedMessages = JSON.parse(messages);

    return parsedMessages;
  }
};

export default db;
