'use strict';

const should = require('should');

const TestFixtureProvider = require('../../dist/commonjs').TestFixtureProvider;

describe('Process-Engine   Parse BPMN Process into new object model', () => {

  let testFixtureProvider;
  let bpmnModelParser;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    bpmnModelParser = await testFixtureProvider.resolveAsync('BpmnModelParser');
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('Should successfully and correctly parse the generic sample BPMN into a ObjectModel structure', async () => {

    const sampleProcessName = 'generic_sample';

    const sampleBpmnFile = testFixtureProvider.readProcessModelFile(sampleProcessName);

    const result = await bpmnModelParser.parseXmlToObjectModel(sampleBpmnFile);

    // Basic Definitions-Properties
    should.exist(result.xmlns);
    should.exist(result.collaboration);
    should(result.id).be.equal('Definitions_1');
    should(result.processes).be.an.instanceOf(Array);
    should(result.processes.length).be.equal(1);

    // Collaboration and Participants
    const collaboration = result.collaboration;

    should(collaboration.id).be.equal('Definitions_1');
    should(collaboration.participants).be.an.instanceOf(Array);
    should(collaboration.participants.length).be.equal(1);

    const participant = collaboration.participants[0];

    should(participant.id).be.equal('GenericSample');
    should(participant.name).be.equal('Generic Sample');
    should(participant.processReference).be.equal('generic_sample');

    // Process-Properties
    const process = result.processes[0];
    should(process.id).be.equal('generic_sample');
    should(process.name).be.equal('generic_sample');
    should(process.isExecutable).be.equal(true);
    should(process.flowNodes.length).be.equal(10);
    should(process.sequenceFlows.length).be.equal(10);
  });

  it('should successfully parse a ProcessModel which contains an empty lane', async () => {

    const sampleProcessName = 'empty_lane_test';

    const sampleBpmnFile = testFixtureProvider.readProcessModelFile(sampleProcessName);

    const result = await bpmnModelParser.parseXmlToObjectModel(sampleBpmnFile);

    // Basic Definitions-Properties
    should.exist(result.xmlns);
    should.exist(result.collaboration);
    should(result.id).be.equal('Definition_1');
    should(result.processes).be.an.instanceOf(Array);
    should(result.processes.length).be.equal(1);

    // Collaboration and Participants
    const collaboration = result.collaboration;

    should(collaboration.id).be.equal('Definition_1');
    should(collaboration.participants).be.an.instanceOf(Array);
    should(collaboration.participants.length).be.equal(1);

    const participant = collaboration.participants[0];

    should(participant.id).be.equal('Participant_0px403d');
    should(participant.name).be.equal('empty_lane_test');
    should(participant.processReference).be.equal('empty_lane_test');

    // Process-Properties
    const process = result.processes[0];
    should(process.id).be.equal('empty_lane_test');
    should(process.name).be.equal('empty_lane_test');
    should(process.isExecutable).be.equal(false);
    should(process.flowNodes.length).be.equal(2);
    should(process.sequenceFlows.length).be.equal(1);
  });

});
