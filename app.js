/**
 * @description
 * A module for performing basic RabbitMQ adiminstration tasks through a Javascript API.
 * Useful if you need to start \ stop \ clean RabbitMQ through a script etc..
 */

const axios = require('axios');

let baseURL  = 'http://localhost:15672/api';
let username = 'guest';
let password = 'guest';


exports.setCredentials = async function(user = username, pass = password) {
    username = user;
    password = pass;
}

exports.setBaseURL = async function(newBaseURL = baseURL) {
    baseURL = newBaseURL;
}

exports.isUp = async function() {
    try {
        await get('/overview');
        return true;
    }
    catch (error) {
        return false;
    }
}

exports.getQueues = async function() {
    await assertRabbitIsAvailable();

    const response = await get('/queues?columns=name');
    return response.data.map(q => q.name);
}

exports.createQueue = async function(name) {
    await assertRabbitIsAvailable();
    await put('/queues/%2f/' + name);
}

exports.deleteQueue = async function(name) {
    await assertRabbitIsAvailable();
    await del('/queues/%2f/' + name);
}

exports.deleteAllQueues = async function() {
    await assertRabbitIsAvailable();

    const queues = await exports.getQueues();

    while (queues.length) {
        const qName = queues.pop();
        await del('/queues/%2f/' + qName);
    }
}

exports.getExchanges = async function() {
    await assertRabbitIsAvailable();

    const response = await get('/exchanges?columns=name');

    return response.data
            .map(e => e.name)
            .filter(name => name && !name.startsWith('amq.'));
}

exports.createExchange = async function(name, type) {
    await assertRabbitIsAvailable();
    await put('/exchanges/%2f/' + name, { type: type });
}

exports.deleteExchange = async function(name) {
    await assertRabbitIsAvailable();
    await del('/exchanges/%2f/' + name);
}

exports.deleteAllExchanges = async function() {
    await assertRabbitIsAvailable();

    const exchanges = await exports.getExchanges();

    while (exchanges.length) {
        const eName = exchanges.pop();
        await del('/exchanges/%2f/' + eName);
    }
}

exports.getConnections = async function() {
    await assertRabbitIsAvailable();

    const response = await get('/connections?columns=name');
    return response.data.map(c => c.name);
}

exports.deleteConnection = async function(name) {
    await assertRabbitIsAvailable();
    await del('/connections/' + encodeURIComponent(name));
}

exports.deleteAllConnections = async function() {
    await assertRabbitIsAvailable();

    const connections = await exports.getConnections();

    while (connections.length) {
        const cName = connections.pop();
        await del('/connections/' + encodeURIComponent(cName));
    }
}

exports.getQueueMessageCount = async function(name) {
    await assertRabbitIsAvailable();
    const response = await get(`/queues/%2f/${encodeURIComponent(name)}?columns=messages`);
    return response.data.messages;
}

exports.deleteEverything = async function(){
    await exports.deleteAllConnections();
    await exports.deleteAllQueues();
    await exports.deleteAllExchanges();
}

async function assertRabbitIsAvailable() {
    if (await exports.isUp() === false) {
        const eMsg = 'RabbitMQAdmin.assertRabbitIsAvailable() :: Could not connect to RabbitMQ. '
                   + 'Verify that the RabbitMQ is up on localhost, or make sure to set a base URL using .setBaseURL(..)';

        throw new Error(eMsg);
    }
}

async function get(endpoint) {
    return await axios.get(baseURL + endpoint, {
        auth: {
            username: username,
            password: password
        }
    });
}

async function put(endpoint, data = {}) {
    return await axios.put(baseURL + endpoint, data, {
        auth: {
            username: username,
            password: password
        }
    });
}

async function del(endpoint) {
    // try to delete the resource
    // but ignore 404 errors (resource not found - nothing to delete)
    try {
        return await axios.delete(baseURL + endpoint, {
            auth: {
                username: username,
                password: password
            }
        });
    }
    catch (deleteError) {
        if (deleteError.response && deleteError.response.status !== 404)
            throw deleteError;
    }
}

