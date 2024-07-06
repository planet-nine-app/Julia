import db from '../persistence/db.js';
import sessionless from 'sessionless-node';

const sk = (keys) => {
  global.keys = keys;
};

const gk = () => {
  return keys;
};

sessionless.generateKeys(sk, gk);

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const randomLetters = (quantity) => {
  let letters = '';
  while(quantity) {
    letters += alphabet[Math.floor(Math.random() * 26)];
    quantity--;
  }
  return letters;
};

const associate = {
  getPrompt: async (user) => {
    const timestamp = new Date().getTime() + '';
    const uuid = user.uuid;
    const prompt = randomLetters(4);

    const message = timestamp + uuid + prmpt;
    const signature = await sessionles.sign(message); 
    
    return {timestamp, uuid, prompt, signature};
  },

  associate: async (user, associatedUser) => {
    return (await db.associateUsers(user, associatedUser));    
  },

  deleteAssociation: async (user, associatedUser) => {
    return (await db.deleteAssociation(user, associatedUser));
  }
};
