const amqp   = require('amqplib');
const should = require('chai').should;
should();

const rabbitop = require('../app');


describe('Utils: rabbitmqAdmin', function suite() {
    const amqpURL = 'amqp://localhost';
    const testQueueName = 'test-q-' + Math.random().toString(16).slice(2);
    const testExchangeName = 'test-exchg-' + Math.random().toString(16).slice(2);

    before(async () => {
        await rabbitop.deleteAllExchanges();
        await rabbitop.deleteAllQueues();
    });

    it('#isUp()', async () => {
        const isUp = await rabbitop.isUp();
        isUp.should.equal(true, 'rabbitmq could not be reached');
    });

    it('#getQueues()', async () => {
        const queues = await rabbitop.getQueues();
        queues.should.be.an('array', 'bad result, expected to get an array');
    });

    it('#createQueue()', async () => {
        await rabbitop.createQueue(testQueueName);

        const queues = await rabbitop.getQueues();
        queues.should.contain(testQueueName, `test queue "${testQueueName}" was not found in list-of-queues`);

        await rabbitop.deleteQueue(testQueueName);
    });

    it('#deleteQueue()', async () => {
        await rabbitop.createQueue(testQueueName);
        await rabbitop.deleteQueue(testQueueName);

        const queues = await rabbitop.getQueues();
        queues.should.not.contain(testQueueName, `test queue "${testQueueName}" was not deleted`);
    });

    it('#deleteAllQueues()', async () => {
        await rabbitop.createQueue(testQueueName);
        await rabbitop.deleteAllQueues();

        const queues = await rabbitop.getQueues();
        queues.should.have.lengthOf(0, 'expected queues to be empty');
    });

    it('#getExchanges()', async () => {
        const exchanges = await rabbitop.getExchanges();
        exchanges.should.be.an('array', 'bad result, expected to get an array');
    });

    it('#createExchange()', async () => {
        await rabbitop.createExchange(testExchangeName, 'direct');

        const exchanges = await rabbitop.getExchanges();
        exchanges.should.contain(testExchangeName, `test exchange "${testExchangeName}" was not found in list-of-exchanges`);
    });

    it('#deleteExchange()', async () => {
        await rabbitop.createExchange(testExchangeName, 'direct');
        await rabbitop.deleteExchange(testExchangeName);

        const exchanges = await rabbitop.getExchanges();
        exchanges.should.not.contain(testExchangeName, `test exchange "${testExchangeName}" was not deleted`);
    });

    it('#deleteAllExchanges()', async () => {
        await rabbitop.createExchange(testExchangeName, 'direct');
        await rabbitop.deleteAllExchanges();

        const exchanges = await rabbitop.getExchanges();
        exchanges.should.have.lengthOf(0, 'expected exchanges to be empty');
    });

    it('#getConnections()', async () => {
        const conn = await amqp.connect(amqpURL);

        // wait a bit for the connection to be listed in Rabbit's resources before getting the connections
        await new Promise(r => setTimeout(r, 5000));
        const cons = await rabbitop.getConnections();

        // close the connection before all the assertions, so that failed assertions won't hang the process on the connection
        await conn.close();

        cons.should.be.an('array', 'bad result, expected to get an array');
        cons.should.not.be.empty;
    });

    it('deleteConnection()', async () => {
        await amqp.connect(amqpURL);

        // wait a bit for the connection to be listed in Rabbit's resources before getting the connections
        await new Promise(r => setTimeout(r, 5000));
        let cons = await rabbitop.getConnections();

        await rabbitop.deleteConnection(cons[0]);

        await new Promise(r => setTimeout(r, 5000));
        cons = await rabbitop.getConnections();

        cons.should.not.contain(cons[0]);
    });

    it('#deleteAllConnections()', async () => {
        await amqp.connect(amqpURL);
        await amqp.connect(amqpURL);

        // wait a bit for the connection to be listed in Rabbit's resources before getting the connections
        await new Promise(r => setTimeout(r, 5000));

        await rabbitop.deleteAllConnections();

        await new Promise(r => setTimeout(r, 5000));
        const cons = await rabbitop.getConnections();

        cons.should.be.empty;
    });

    it('#getQueueMessageCount()', async () => {
        const conn = await amqp.connect(amqpURL);
        const chan = await conn.createChannel();

        // make sure our queue is empty - by deleting it
        await rabbitop.deleteQueue(testQueueName);
        await rabbitop.createQueue(testQueueName);

        await chan.publish('', testQueueName, new Buffer('test message'));

        // wait for the message to populate
        await sleep(10000);

        const msgCount = await rabbitop.getQueueMessageCount(testQueueName);
        msgCount.should.equal(1);

        await conn.close();
    });
});


async function sleep(ms){
    await new Promise(r => setTimeout(r,ms));
}
