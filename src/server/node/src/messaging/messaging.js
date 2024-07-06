import db from '../persistence/db.js';

const messaging = {
  messageUser: async (sender, receiver, message) => {
console.log('sender: ' + JSON.stringify(sender));
console.log('receiver: ' + JSON.stringify(receiver));
    if(!sender.keys.interactingKeys[receiver.uuid] || !receiver.keys.interactingKeys[sender.uuid]) {
      return false;
    }
    return await db.messageUser(sender, receiver, message);
  },

  getMessages: async (user) => {
    const messages = await db.getMessages(user);

    return messages;
  }
};

export default messaging;
