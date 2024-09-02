import julia from '../../src/client/javascript/julia.js';
import sessionless from 'sessionless-node';
import { should } from 'chai';
should();

console.log(julia);

let savedUser = {};
let savedUser2 = {};
let keys = {};
let keys2 = {};
let keysToReturn = {};
let savedPrompt = '';
const hash = 'firstHash';
const secondHash = 'secondHash';

it('should register a user', async () => {
  savedUser = await julia.createUser((k) => { keysToReturn = k; }, () => { return keysToReturn; });
  savedUser.uuid.length.should.equal(36);
  keys = keysToReturn;
});

it('should register another user', async () => {
  savedUser2 = await julia.createUser((k) => { keysToReturn = k; }, () => { return keysToReturn; });
  savedUser2.uuid.length.should.equal(36);
  keys2 = keysToReturn;
  keysToReturn = keys;
});

it('should get user by uuid', async () => {
  const user = await julia.getUser(savedUser.uuid);
  user.uuid.length.should.equal(36);
});

it('should get a prompt', async () => {
  const updatedUser = await julia.getPrompt(savedUser.uuid);
  savedUser = updatedUser;
  savedPrompt = Object.keys(updatedUser.pendingPrompts).pop();
  savedPrompt.length.should.equal(4);
});

it('should sign a prompt', async () => {
  keysToReturn = keys2;
  const success = await julia.signPrompt(savedUser2.uuid, savedPrompt);
  success.should.equal(true);

  keysToReturn = keys;
  savedUser = await julia.getUser(savedUser.uuid);
  savedUser.pendingPrompts[savedPrompt].newUUID.should.equal(savedUser2.uuid);
});

it('should associate', async () => {
  savedUser = await julia.associate(savedUser.uuid, savedUser.pendingPrompts[savedPrompt]);
console.log('savedUSer', savedUser);
  savedUser.keys.interactingKeys[savedUser2.uuid].length.should.equal(66);
});

it('should post a message', async () => {
  const success = await julia.postMessage(savedUser.uuid, savedUser2.uuid, 'Hello world');
  success.should.equal(true);
});

it('should get messages', async () => {
  const messages = await julia.getMessages(savedUser.uuid);
  messages.length.should.equal(1);
});

it('it should delete an association', async () => {
  savedUser = await julia.deleteKey(savedUser.uuid, savedUser2.uuid);
  const noKey = savedUser.keys.interactingKeys[savedUser2.uuid] === undefined;
  noKey.should.equal(true);
});

it('should delete a user', async () => {
  const res = await julia.deleteUser(savedUser.uuid);
  res.should.equal(true);
});
