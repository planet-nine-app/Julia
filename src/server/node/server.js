import config from './config/local.js';
import express from 'express';
import cors from 'cors';
import { createHash } from 'node:crypto';
import user from './src/user/user.js';
import associate from './src/associate/associate.js';
import messaging from './src/messaging/messaging.js';
import MAGIC from './src/magic/magic.js';
import fount from 'fount-js';
import bdo from 'bdo-js';
import sessionless from 'sessionless-node';
import db from './src/persistence/db.js';

const sk = (keys) => {
  global.keys = keys;
};

const gk = () => {
  return keys;
};

sessionless.generateKeys(sk, gk);

const app = express();
app.use(cors());
app.use(express.json());

const SUBDOMAIN = process.env.SUBDOMAIN || 'dev';
fount.baseURL = process.env.LOCALHOST ? 'http://localhost:3006/' : `${SUBDOMAIN}.fount.allyabase.com/`;
bdo.baseURL = process.env.LOCALHOST ? 'http://localhost:3003/' : `${SUBDOMAIN}.bdo.allyabase.com/`;

const bdoHashInput = `${SUBDOMAIN}continuebee`;

const bdoHash = createHash('sha256').update(bdoHashInput).digest('hex');

const repeat = (func) => {
  setTimeout(func, 2000);
};

const bootstrap = async () => {
  try {
    const fountUser = await fount.createUser(db.saveKeys, db.getKeys);
    const bdoUUID = await bdo.createUser(bdoHash, {}, () => {}, db.getKeys);
    const spellbooks = await bdo.getSpellbooks(bdoUUID, bdoHash);
    const julia = {
      uuid: 'julia',
      fountUUID: fountUser.uuid,
      fountPubKey: fountUser.pubKey,
      bdoUUID,
      keys: {interactingKeys: {}, coordinatingKeys: {}},
      spellbooks
    };

    if(!julia.fountUUID || !julia.bdoUUID || !spellbooks) {
      throw new Error('bootstrap failed');
    }

    await db.saveUser(julia);
  } catch(err) {
    repeat(bootstrap);
  }
};

repeat(bootstrap);

app.use((req, res, next) => {
  const requestTime = +req.query.timestamp || +req.body.timestamp;
  const now = new Date().getTime();
  if(Math.abs(now - requestTime) > config.allowedTimeDifference) {
    return res.send({error: 'no time like the present'});
  }
  next();
});

app.put('/user/create', async (req, res) => {
  try {
    const pubKey = req.body.pubKey;
    const message = req.body.timestamp +  pubKey;
    const signature = req.body.signature;
   
    if(!signature || !sessionless.verifySignature(signature, message, pubKey)) {
      res.status(403);
      return res.send({error: 'auth error'});
    }

    const foundUser = await user.putUser(req.body.user);
    res.send(foundUser);
  } catch(err) {
    res.status(404);
    res.send({error: 'not found'});
  }
});

app.get('/user/:uuid', async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const timestamp = req.query.timestamp;
    const signature = req.query.signature;
    const message = timestamp + uuid;
   
    const foundUser = await user.getUser(req.params.uuid);

    if(!signature || !sessionless.verifySignature(signature, message, foundUser.pubKey)) {
      res.status(403);
      return res.send({error: 'auth error'});
    }

    res.send(foundUser);
  } catch(err) {
console.log(err);
    res.status(404);
    res.send({error: 'not found'});
  }
});

app.get('/user/:uuid/associate/prompt', async (req, res) => {
  try {
console.log('getting a prompt');
    const uuid = req.params.uuid;
    const timestamp = req.query.timestamp;
    const signature = req.query.signature;
    const message = timestamp + uuid;

    const foundUser = await user.getUser(req.params.uuid);
console.log('found a user');

    if(!signature || !sessionless.verifySignature(signature, message, foundUser.pubKey)) {
console.log('here for some reason');
      res.status(403);
      return res.send({error: 'auth error'});
    }
console.log('userWithPrompt coming');

    const userWithPrompt = await associate.getPrompt(foundUser);

  console.log('\n\n\n');
  console.log('Start with: ', userWithPrompt.pendingPrompts);
  console.log('\n\n\n');

  //console.log('sending back: ', userWithPrompt);

    res.send(userWithPrompt);
  } catch(err) {
console.warn(err);
    res.status(404);
    res.send({error: 'not found'});
  }
});

app.post('/user/:uuid/associate/signedPrompt', async (req, res) => {
//console.log('rew.body is', req.body);
  try {
  console.log('\n\n\n');
  console.log('signed prompt', req.body.prompt);
  console.log('\n\n\n');
    const uuid = req.params.uuid;
    const timestamp = req.body.timestamp;
    const pubKey = req.body.pubKey;
    const prompt = req.body.prompt;
    const signature = req.body.signature;
    const message = timestamp + uuid + pubKey + prompt;
  console.log(message);

    const foundUser = await user.getUser(req.params.uuid);

  console.log('after found user');

    if(!signature || !sessionless.verifySignature(signature, message, foundUser.pubKey)) {
  console.log('auth failed');
      res.status(403);
      return res.send({error: 'auth error'});
    }

  console.log('uuid here is: ' + req.body.uuid);
    
    const result = await associate.saveSignedPrompt(foundUser, req.body);
  console.log('should return success: ' + result);
    res.send({success: result});
  } catch(err) {
    res.status(404);
    res.send({error: 'not found'});
  }
});

app.post('/user/:uuid/associate', async (req, res) => {
  try {
  console.log("\n\n\n\n\n\n");
  console.log('associated prompt', req.body.prompt);
  console.log("\n\n\n\n\n\n");
    const uuid = req.params.uuid;
    const newTimestamp = req.body.newTimestamp;
    const newUUID = req.body.newUUID;
    const newPubKey = req.body.newPubKey;
    const prompt = req.body.prompt;
    const signature = req.body.signature;
    const newSignature = req.body.newSignature;
    const message = newTimestamp + newUUID + newPubKey + prompt;

    const foundUser = await user.getUser(req.params.uuid);

    if(!foundUser.pendingPrompts[prompt] || 
       !(foundUser.pendingPrompts[prompt].prompter === foundUser.uuid && 
       foundUser.pendingPrompts[prompt].newUUID === newUUID)) {
  console.log("first check failed");
      res.status(404);
      return res.send({error: 'prompt not found'});
    }

  console.log('message here is: ' + message);

    if(!signature || !sessionless.associate(signature, message, foundUser.pubKey, newSignature, message, newPubKey)) {
  console.log('association signatures failes');
  console.log(signature);
  console.log(newSignature);
  console.log(foundUser.pubKey);
  console.log(newPubKey);
      res.status(403);
      return res.send({error: 'auth error'});
    } 

    const associatedUser = await user.getUser(newUUID);
    const updatedUser = await associate.associate(foundUser, associatedUser);
    await associate.removePrompt(foundUser, prompt);
    const doubleUpdatedUser = await user.getUser(uuid);

  console.log("sending back doubleUpdatedUser", doubleUpdatedUser);

    res.send(doubleUpdatedUser);
  } catch(err) {
    res.status(404);
    res.send({error: 'not found'});
  }
});

app.post('/magic/spell/:spellName', async (req, res) => {
console.log('got spell req');
  try {
    const spellName = req.params.spellName;
    const spell = req.body;
    
    switch(spellName) {
      case 'joinup': const joinupResp = await MAGIC.joinup(spell);
        return res.send(joinupResp);
        break;
      case 'linkup': const linkupResp = await MAGIC.linkup(spell);
	return res.send(linkupResp);
	break;
    }

    res.status(404);
    res.send({error: 'spell not found'});
  } catch(err) {
console.warn(err);
    res.status(404);
    res.send({error: 'not found'});
  }
});

app.delete('/associated/:associatedUUID/user/:uuid', async (req, res) => {
  try {
    const associatedUUID = req.params.associatedUUID;
    const uuid = req.params.uuid;
    const timestamp = req.body.timestamp;
    const signature = req.body.signature;
    const message = timestamp + associatedUUID + uuid;

    const foundUser = await user.getUser(req.params.uuid);

    if(!signature || !sessionless.verifySignature(signature, message, foundUser.pubKey)) {
      res.status(403);
      return res.send({error: 'auth error'});
    }

    const associatedUser = await user.getUser(associatedUUID);
    const disassociated = await associate.deleteAssociation(foundUser, associatedUser);

    if(disassociated) {
  console.log("disassociated!");
      const updatedUser = await user.getUser(req.params.uuid);
      return res.send(updatedUser);
    }
  console.log("It failed");

    res.send(foundUser);
  } catch(err) {
    res.status(404);
    res.send({error: 'not found'});
  }
});

app.delete('/user/:uuid', async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const timestamp = req.body.timestamp;
    const signature = req.body.signature;
    const message = timestamp + uuid;

    const foundUser = await user.getUser(req.params.uuid);

    if(!signature || !sessionless.verifySignature(signature, message, foundUser.pubKey)) {
      res.status(403);
      return res.send({error: 'auth error'});
    }

    const result = await user.deleteUser(foundUser);
    
    res.send({success: result});
  } catch(err) {
    res.status(404);
    res.send({error: 'not found'});
  }
});

app.post('/message', async (req, res) => {
  try {
    const timestamp = req.body.timestamp;
    const senderUUID = req.body.senderUUID;
    const receiverUUID = req.body.receiverUUID;
    const message = req.body.message;
    const signature = req.body.signature;
    const msg = timestamp + senderUUID + receiverUUID + message;

    const sender = await user.getUser(senderUUID);

  console.log('got stuff');

    if(!signature || !sessionless.verifySignature(signature, msg, sender.pubKey)) {
  console.log('auth error');
      res.status(403);
      return res.send({error: 'auth error'});
    }

    const receiver = await user.getUser(receiverUUID);
  console.log('got receiver');

    if(!receiver) {
      return res.send({success: false});
    }

    const result = await messaging.messageUser(sender, receiver, req.body);

    res.send({success: result});
  } catch(err) {
    res.status(404);
    res.send({error: 'not found'});
  }
});

app.get('/messages/user/:uuid', async (req, res) => {
  try {
    const timestamp = req.query.timestamp;
    const uuid = req.params.uuid;
    const signature = req.query.signature;
    const message = timestamp + uuid;

    const foundUser = await user.getUser(req.params.uuid);

    if(!signature || !sessionless.verifySignature(signature, message, foundUser.pubKey)) {
      res.status(403);
      return res.send({error: 'auth error'});
    }

    const messages = await messaging.getMessages(foundUser);
    res.send({ messages });
  } catch(err) {
    res.status(404);
    res.send({error: 'not found'});
  }
});

app.listen(3000);

console.log('julia\'s ready for connections');
