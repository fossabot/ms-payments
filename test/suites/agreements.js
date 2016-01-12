/* global TEST_CONFIG */
const Promise = require('bluebird');
const assert = require('assert');
const Browser = require('zombie');
const { debug, duration } = require('../utils');

describe('Agreements suite', function AgreementSuite() {
  const browser = new Browser({ runScripts: false, waitDuration: duration });
  const Payments = require('../../src');

  // mock paypal requests
  // require('../mocks/paypal');
  const { testAgreementData, testPlanData } = require('../data/paypal');

  const createPlanHeaders = { routingKey: 'payments.plan.create' };
  const deletePlanHeaders = { routingKey: 'payments.plan.delete' };
  const statePlanHeaders = { routingKey: 'payments.plan.state' };

  let planId;
  let payments;

  this.timeout(duration * 2);

  before(function startService() {
    payments = new Payments(TEST_CONFIG);
    return payments.connect();
  });

  before(function initPlan() {
    return payments.router(testPlanData, createPlanHeaders).then(plan => {
      const id = plan.id.split('|')[0];
      planId = id;
      testAgreementData.plan.id = id;
      return payments.router({ id, state: 'active' }, statePlanHeaders);
    });
  });

  after(function deletePlan() {
    return payments.router(planId, deletePlanHeaders);
  });

  describe('unit tests', function UnitSuite() {
    const createAgreementHeaders = { routingKey: 'payments.agreement.create' };
    const executeAgreementHeaders = { routingKey: 'payments.agreement.execute' };

    let billingAgreement;

    it('Should fail to create agreement on invalid schema', () => {
      return payments.router({ random: true }, createAgreementHeaders)
        .reflect()
        .then((result) => {
          assert(result.isRejected());
          assert.equal(result.reason().name, 'ValidationError');
        });
    });

    it('Should create an agreement', () => {
      const data = {
        agreement: testAgreementData,
        owner: 'test@test.com',
      };

      return payments.router(data, createAgreementHeaders)
        .reflect()
        .then((result) => {
          debug(result);
          assert(result.isFulfilled());
          billingAgreement = result.value();
        });
    });

    it('Should fail to execute on an unknown token', () => {
      return payments.router('random token', executeAgreementHeaders)
        .reflect()
        .then((result) => {
          assert(result.isRejected());
        });
    });

    it('Should reject unapproved agreement', () => {
      return payments.router({ token: billingAgreement.token }, executeAgreementHeaders)
        .reflect()
        .then((result) => {
          assert(result.isRejected());
        });
    });

    it('Should execute an approved agreement', () => {
      return browser.visit(billingAgreement.url)
        .then(() => {
          browser.assert.success();
          return browser.pressButton('#loadLogin');
        })
        .then(() => {
          return browser
            .fill('#login_email', 'test@cappacity.com')
            .fill('#login_password', '12345678')
            .pressButton('#submitLogin');
        })
        .then(() => {
          // TypeError: unable to verify the first certificate
          return browser
            .pressButton('#continue')
            .catch(err => {
              assert.equal(err.message, 'unable to verify the first certificate');
              return { success: true, err };
            });
        })
        .then(() => {
          return payments.router({ token: billingAgreement.token }, executeAgreementHeaders)
            .reflect()
            .then((result) => {
              debug(result);
              assert(result.isFulfilled());
            });
        });
    });
  });
});