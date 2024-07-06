import db from '../persistence/db.js';

const messaging = {
  messageUser: async (sender, receiver, message) => {
    if(!sender.keys.interactiveKeys[receiver.uuid] || !receiver.keys.interactiveKeys[sender.uuid]) {
      return false;
    }
    return await db.messageUser(sender, receiver, message);
  },

  getMessages: async (user) => {
    const messages = await db.getMessages(user);

    return messages;
  }
};
