'use strict';

var async = require('async');

var user = require('../user');
var meta = require('../meta');
var accountHelpers = require('./accounts/helpers');

var userController = module.exports;

userController.getCurrentUser = function (req, res, next) {
	if (!req.uid) {
		return res.status(401).json('not-authorized');
	}
	async.waterfall([
		function (next) {
			user.getUserField(req.uid, 'userslug', next);
		},
		function (userslug, next) {
			accountHelpers.getUserDataByUserSlug(userslug, req.uid, next);
		},
		function (userData) {
			res.json(userData);
		},
	], next);
};


userController.getUserByUID = function (req, res, next) {
	byType('uid', req, res, next);
};

userController.getUserByUsername = function (req, res, next) {
	byType('username', req, res, next);
};

userController.getUserByEmail = function (req, res, next) {
	byType('email', req, res, next);
};

function byType(type, req, res, next) {
	userController.getUserDataByField(req.uid, type, req.params[type], function (err, data) {
		if (err || !data) {
			return next(err);
		}
		res.json(data);
	});
}

userController.getUserDataByField = function (callerUid, field, fieldValue, callback) {
	async.waterfall([
		function (next) {
			if (field === 'uid') {
				next(null, fieldValue);
			} else if (field === 'username') {
				user.getUidByUsername(fieldValue, next);
			} else if (field === 'email') {
				user.getUidByEmail(fieldValue, next);
			} else {
				next();
			}
		},
		function (uid, next) {
			if (!uid) {
				return next();
			}
			userController.getUserDataByUID(callerUid, uid, next);
		},
	], callback);
};

userController.getUserDataByUID = function (callerUid, uid, callback) {
	if (!parseInt(callerUid, 10) && parseInt(meta.config.privateUserInfo, 10) === 1) {
		return callback(new Error('[[error:no-privileges]]'));
	}

	if (!parseInt(uid, 10)) {
		return callback(new Error('[[error:no-user]]'));
	}

	async.parallel({
		userData: async.apply(user.getUserData, uid),
		settings: async.apply(user.getSettings, uid),
	}, function (err, results) {
		if (err || !results.userData) {
			return callback(err || new Error('[[error:no-user]]'));
		}

		results.userData.email = results.settings.showemail ? results.userData.email : undefined;
		results.userData.fullname = results.settings.showfullname ? results.userData.fullname : undefined;

		callback(null, results.userData);
	});
};