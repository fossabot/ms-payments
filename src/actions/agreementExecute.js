const Promise = require('bluebird')
const Errors = require('common-errors')

const paypal = require('paypal-rest-sdk')

function agreementExecute(planId) {
	const {
		_redis: redis,
		_config: config
	} = this

	let promise = Promise.bind(this)

	return promise
}

module.exports = agreementExecute
