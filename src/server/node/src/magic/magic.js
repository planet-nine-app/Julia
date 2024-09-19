import sessionless from 'sessionless-node';
import user from '../user/user.js';
import db from '../persistence/db.js';

sessionless.getKeys = async () => {
  return await db.getKeys();
};

const fountURL = 'http://localhost:3006/';

const MAGIC = {
  joinup: async (spell) => {
    const gateway = await gatewayForSpell(spell.spellName);
    spell.gateways.push(spell);

    const spellbook = await db.get('spellbook');
    const nextIndex = spellbook.destinations.indexOf(spellbook.destinations.find(($) => $.stopName === 'addie'));
    const nextDestination = spellbook.destinations[nextIndex].stopURL;

    const res = await MAGIC.forwardSpell(spell, nextDestination);
    const body = await res.json();
 
    if(!body.success) {
      return body;
    }

    const foundUser = await user.putUser(spell.user);
    if(!body.uuids) {
      body.uuids = [];
    }
    body.uuids.push({
      service: 'julia',
      uuid: foundUser.uuid
    });

    return body;
  },

  linkup: async (spell) => {
    const foundUser = await user.getUser(spell.casterUUID);

    const coordinatingKeys = [];
    spell.gateways.forEach(gateway => coordinatingKeys.push(gateway.coordinatingKey));

    if(coordinatingKeys.filter(keys => keys).length !== spell.gateways.length) {
      throw new Error('missing coordinating key');
    }

    const gateway = await gatewayForSpell(spell.spellName);
    spell.gateways.push(gateway);

    const res = await MAGIC.forwardSpell(spell, fountURL);
    const body = await res.json();

    if(!body.success) {
      return body;
    }

    return body;
  },

  gatewayForSpell: async (spellName) => {
    const julia = await db.getUser('julia');
    const gateway = {
      timestamp: new Date().getTime() + '',
      uuid: julia.uuid, 
      minimumCost: 20,
      ordinal: julia.ordinal
    };      

    const message = gateway.timestamp + gateway.uuid + gateway.minimumCost + gateway.ordinal;

    gateway.signature = await sessionless.sign(message);

    return gateway;
  },

  forwardSpell: async (spell, destination) => {
    return await fetch(destination, {
      method: 'post',
      body: JSON.stringify(spell),
      headers: {'Content-Type': 'application/json'}
    });
  }
};

export default MAGIC;
