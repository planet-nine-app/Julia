import db from '../persistence/db.js';

const user = {
  getUser: async (uuid, signature, timestamp) => {
    const user = await db.getUser(uuid);
    return user;
  }, 

  putUser: async (pubKey, user) => {
    const uuid = await db.putUser(pubKey, user);

    user.uuid = uuid; 

    return user;
  },
  
  deleteUser: async (user) => {
    return (await db.deleteUser(user));
  }
};

export default user;
