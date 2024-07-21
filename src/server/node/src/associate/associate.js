import db from '../persistence/db.js';
import sessionless from 'sessionless-node';

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

    /**
     * need to think more about this
     */
    //const message = timestamp + uuid + prompt;
    //const signature = await sessionless.sign(message); 

    user.pendingPrompts = await db.startPrompt(user, prompt);
    
    return user;
  },

  saveSignedPrompt: async (user, saveSignedPrompt) => {
    return (await db.saveSignedPrompt(user, saveSignedPrompt));
  },

  associate: async (user, associatedUser) => {
    return (await db.associateUsers(user, associatedUser));    
  },

  deleteAssociation: async (user, associatedUser) => {
    return (await db.deleteAssociation(user, associatedUser));
  }
};

export default associate;
