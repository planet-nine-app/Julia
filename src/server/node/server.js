import config from './config/local.js';
import express from 'express';
import user from './src/user/user.js';
import associate from './src/associate/associate.js';
import messaging from './src/messaging/messaging.js';
import sessionless from 'sessionless-node';

const sk = (keys) => {
  global.keys = keys;
};

const gk = () => {
  return keys;
};

sessionless.generateKeys(sk, gk);

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const requestTime = +req.query.timestamp || +req.body.timestamp;
  const now = new Date().getTime();
  if(Math.abs(now - requestTime) > config.allowedTimeDifference) {
    return res.send(new Error('no time like the present'));
  }
  next();
});

app.put('/user/create', async (req, res) => {
  const pubKey = req.body.pubKey;
  const message = req.body.timestamp +  pubKey;
  const signature = req.body.signature;
  
  if(!signature || !sessionless.verifySignature(signature, message, pubKey)) {
    res.status(403);
    return res.send({error: 'auth error'});
  }

  const foundUser = await user.putUser(req.body.user);
  res.send(foundUser);
});

app.get('/user/:uuid', async (req, res) => {
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
});

app.get('/user/:uuid/associate/prompt', async (req, res) => {
  const uuid = req.params.uuid;
  const timestamp = req.query.timestamp;
  const signature = req.query.signature;
  const message = timestamp + uuid;

  const foundUser = await user.getUser(req.params.uuid);

  if(!signature || !sessionless.verifySignature(signature, message, foundUser.pubKey)) {
    res.status(403);
    return res.send({error: 'auth error'});
  }

  const prompt = await associate.getPrompt(foundUser);

  res.send(prompt);
});

app.post('/user/:uuid/associate/signedPrompt', async (req, res) => {
  const uuid = req.params.uuid;
  const timestamp = req.body.timestamp;
  const pubKey = req.body.pubKey;
  const prompt = req.body.prompt;
  const signature = req.body.signature;
  const message = timestamp + uuid + pubKey + prompt;

  const foundUser = await user.getUser(req.params.uuid);

  if(!signature || !sessionless.verifySignature(signature, message, foundUser.pubKey)) {
    res.status(403);
    return res.send({error: 'auth error'});
  }

console.log('uuid here is: ' + req.body.uuid);
  
  const result = await associate.saveSignedPrompt(foundUser, req.body);
  res.send({success: result});
});

app.post('/user/:uuid/associate', async (req, res) => {
  const uuid = req.params.uuid;
  const newTimestamp = req.body.newTimestamp;
  const newUUID = req.body.newUUID;
  const newPubKey = req.body.newPubKey;
  const prompt = req.body.prompt;
  const signature = req.body.signature;
  const newSignature = req.body.newSignature;
  const message = newTimestamp + newUUID + newPubKey + prompt;

  const foundUser = await user.getUser(req.params.uuid);

console.log('message here is: ' + message);

  if(!signature || !sessionless.associate(signature, message, foundUser.pubKey, newSignature, message, newPubKey)) {
    res.status(403);
    return res.send({error: 'auth error'});
  } 

  const associatedUser = await user.getUser(newUUID);
  const updatedUser = await associate.associate(foundUser, associatedUser);

  res.send(updatedUser);
});

app.delete('/associated/:associatedUUID/user/:uuid', async (req, res) => {
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

  const associatedUser = await getUser(associatedUUID);
  const association = await associate.deleteAssociation(foundUser, associatedUser);

  res.send(association);
});

app.delete('/user/:uuid', async (req, res) => {
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
});

app.post('/message', async (req, res) => {
  const timestamp = req.body.timestamp;
  const senderUUID = req.body.senderUUID;
  const receiverUUID = req.body.receiverUUID;
  const message = req.body.message;
  const signature = req.body.signature;
  const msg = timestamp + senderUUID + receiverUUID;

  const sender = await user.getUser(senderUUID);

  if(!signature || !sessionless.verifySignature(signature, msg, sender.pubKey)) {
    res.status(403);
    return res.send({error: 'auth error'});
  }

  const receiver = await user.getUser(receiverUUID);

  if(!receiver) {
    return res.send({success: false});
  }

  const result = await messaging.messageUser(sender, receiver, message);

  res.send({success: result});
});

app.get('/messages/user/:uuid', async (req, res) => {
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
});

app.listen(3000);

console.log('server listening on port 3000');
