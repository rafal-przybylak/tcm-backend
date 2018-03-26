'use strict';
var config = require('../../server/config.json');
var path = require('path');
var speakeasy = require('speakeasy');
var loopback = require('loopback');
var assert = require('assert');
var g = require('../../node_modules/loopback/lib/globalize');
var crypto = require('crypto');
var qs = require('querystring');
//import {User as baseUser} from "../../node_modules/loopback/common/models/user"
module.exports = function (User) {
  /**
 * Returns curent user roles
 * @param {Function(Error, array)} callback
 */
  // User.observe('access', function(ctx, next) {
  //   const token = ctx.options && ctx.options.accessToken;
  //   const userId = token && token.userId;
  //   const user = userId ? 'user#' + userId : '<anonymous>';

  //   const modelName = ctx.Model.modelName;
  //   const scope = ctx.where ? JSON.stringify(ctx.where) : '<all records>';
  //   console.log('%s: %s accessed %s:%s', new Date(), user, modelName, scope);
  //   next();
  // });
  // User.beforeRemote('userRoles', function(ctx, unused, next) {
  //   if (!ctx.args.options.accessToken) return next();
  //   User.findById(ctx.args.options.accessToken.userId, function(err, user) {
  //     if (err) return next(err);
  //     ctx.args.options.currentUser = user;
  //     next();
  //   });
  // })

  User.userRoles = function (options, callback) {
    var roles = [];
    Object.keys(options.authorizedRoles).forEach(key => {
      if (options.authorizedRoles[key])
        roles.push(key);
    })

    callback(null, roles);
  };


  User.requestCode = function (credentials, fn) {
    this.findOne({ where: { email: credentials.email } }, function (err, user) {

      if (err) return fn(err);
      if (!user) return fn("Nie ma takiego user.");
      user.hasPassword(credentials.password, function (err, isMatch) {
        if (isMatch) {
          // Note that you'll want to change the secret to something a lot more secure!
          var code = speakeasy.totp({ key: 'APP_SECRET' + credentials.email });
          console.log('Two factor code for ' + credentials.email + ': ' + code);

          // [TODO] hook into your favorite SMS API and send your user their code!

          fn(null, { data: "Kod został wysłany: " + code });
        } else {
          var err = new Error('Sorry, but that email and password do not match!');
          err.statusCode = 401;
          err.code = 'LOGIN_FAILED';
          return fn(err);
        }
      });
    });
  };
  User.beforeRemote('logout', function (context, user, next) {
    console.log('> logout ');
    next();
  });
  // User.beforeRemote('login', function(context, user, next) {
  //   console.log('> user login init ');
  //   next();
  // });
  User.afterRemote('create', function (context, user, next) {

    //var options = User.getVerifyOptions();
    var options = {
      subject: "Witamy w systemie szkoleń MM Poland",
      from: "Szkolenia MM Poland <szkolenia@mmpoland.pl>",
      type: "email",
      template:  "verify.ejs",
      redirect: "http://mmewidencja.pl/tcm/auth-login",
      host: "mmewidencja.pl/tcm",
      port: "80",
      urlPath: "/auth-mail-confirm"
    };

    if (!context.args.options.accessToken) {
      user.verify(options, function (err, response) {
        if (err) {
          User.deleteById(user.id);
          return next(err);
        }
        next();
      });
    } else {
      next();
    }


  });

  User.on('resetPasswordRequest', function (info) {
    var url = info.options.callBackUrl;
    var html = 'Uruchom <a href="' + url + '?token=' +
      info.accessToken.id + '">link</a> resetujący hasło w systemie szkoleniowym MM Poland.';
    const base = User.getVerifyOptions();
    User.app.models.Email.send({
      to: info.email,
      from: base.from,
      subject: 'Szkolenia MM Poland - przywracanie hasła ',
      html: html
    }, function (err) {
      if (err) return console.log('> error sending password reset email');
      console.log('> sending password reset email to:', info.email);
    });
  });

  //render UI page after password change
  // User.afterRemote('changePassword', function(context, user, next) {
  //   context.res.render('response', {
  //     title: 'Password changed successfully',
  //     content: 'Please login again with new password',
  //     redirectTo: '/',
  //     redirectToLinkText: 'Log in'
  //   });
  // });

  //render UI page after password reset
  // User.afterRemote('setPassword', function(context, user, next) {
  //   context.res.render('response', {
  //     title: 'Password reset success',
  //     content: 'Your password has been reset successfully',
  //     redirectTo: '/',
  //     redirectToLinkText: 'Log in'
  //   });
  // });

  User.prototype.verify = function (verifyOptions, options, cb) {

    if (cb === undefined && typeof options === 'function') {
      cb = options;
      options = undefined;
    }
    cb = cb || utils.createPromiseCallback();

    var user = this;
    var userModel = this.constructor;
    var registry = userModel.registry;
    verifyOptions = Object.assign({}, verifyOptions);
    // final assertion is performed once all options are assigned
    assert(typeof verifyOptions === 'object',
      'verifyOptions object param required when calling user.verify()');

    // Shallow-clone the options object so that we don't override
    // the global default options object
    verifyOptions = Object.assign({}, verifyOptions);

    // Set a default template generation function if none provided
    verifyOptions.templateFn = verifyOptions.templateFn || createVerificationEmailBody;

    // Set a default token generation function if none provided
    verifyOptions.generateVerificationToken = verifyOptions.generateVerificationToken ||
      User.generateVerificationToken;

    // Set a default mailer function if none provided
    verifyOptions.mailer = verifyOptions.mailer || userModel.email ||
      registry.getModelByType(loopback.Email);

    var pkName = userModel.definition.idName() || 'id';
    verifyOptions.redirect = verifyOptions.redirect || '/';
    var defaultTemplate ='verify.ejs';
    verifyOptions.template =verifyOptions.template || defaultTemplate;
    verifyOptions.template= path.join(__dirname, "..", "..", "server", "views", verifyOptions.template);
    verifyOptions.user = user;
    verifyOptions.protocol = verifyOptions.protocol || 'http';

    var app = userModel.app;
    verifyOptions.host = verifyOptions.host || (app && app.get('host')) || 'localhost';
    verifyOptions.port = verifyOptions.port || (app && app.get('port')) || 3000;
    verifyOptions.restApiRoot = verifyOptions.restApiRoot || (app && app.get('restApiRoot')) || '/api';

    var displayPort = (
      (verifyOptions.protocol === 'http' && verifyOptions.port == '80') ||
      (verifyOptions.protocol === 'https' && verifyOptions.port == '443')
    ) ? '' : ':' + verifyOptions.port;

    var urlPath = joinUrlPath(
      verifyOptions.restApiRoot,
      userModel.http.path,
      userModel.sharedClass.findMethodByName('confirm').http.path
    );

    verifyOptions.verifyHref = verifyOptions.verifyHref ||
      verifyOptions.protocol +
      '://' +
      verifyOptions.host +
      displayPort +
      (verifyOptions.urlPath || urlPath) +
      '?' + qs.stringify({
        uid: '' + verifyOptions.user[pkName],
        redirect: verifyOptions.redirect,
      });

    verifyOptions.to = verifyOptions.to || user.email;
    verifyOptions.subject = verifyOptions.subject || g.f('Thanks for Registering');
    verifyOptions.headers = verifyOptions.headers || {};

    // assert the verifyOptions params that might have been badly defined
    assertVerifyOptions(verifyOptions);

    // argument "options" is passed depending on verifyOptions.generateVerificationToken function requirements
    var tokenGenerator = verifyOptions.generateVerificationToken;
    if (tokenGenerator.length == 3) {
      tokenGenerator(user, options, addTokenToUserAndSave);
    } else {
      tokenGenerator(user, addTokenToUserAndSave);
    }

    function addTokenToUserAndSave(err, token) {
      if (err) return cb(err);
      user.verificationToken = token;
      user.save(options, function (err) {
        if (err) return cb(err);
        sendEmail(user);
      });
    }

    // TODO - support more verification types
    function sendEmail(user) {
      verifyOptions.verifyHref += '&token=' + user.verificationToken;
      verifyOptions.verificationToken = user.verificationToken;
      verifyOptions.text = verifyOptions.text || g.f('Please verify your email by opening ' +
        'this link in a web browser:\n\t%s', verifyOptions.verifyHref);
      verifyOptions.text = verifyOptions.text.replace(/\{href\}/g, verifyOptions.verifyHref);

      // argument "options" is passed depending on templateFn function requirements
      var templateFn = verifyOptions.templateFn;
      if (templateFn.length == 3) {
        templateFn(verifyOptions, options, setHtmlContentAndSend);
      } else {
        templateFn(verifyOptions, setHtmlContentAndSend);
      }

      function setHtmlContentAndSend(err, html) {
        if (err) return cb(err);

        verifyOptions.html = html;

        // Remove verifyOptions.template to prevent rejection by certain
        // nodemailer transport plugins.
        delete verifyOptions.template;

        // argument "options" is passed depending on Email.send function requirements
        var Email = verifyOptions.mailer;
        if (Email.send.length == 3) {
          Email.send(verifyOptions, options, handleAfterSend);
        } else {
          Email.send(verifyOptions, handleAfterSend);
        }

        function handleAfterSend(err, email) {
          if (err) return cb(err);
          cb(null, { email: email, token: user.verificationToken, uid: user[pkName] });
        }
      }
    }

    return cb.promise;
  };
  function assertVerifyOptions(verifyOptions) {
    assert(verifyOptions.type, 'You must supply a verification type (verifyOptions.type)');
    assert(verifyOptions.type === 'email', 'Unsupported verification type');
    assert(verifyOptions.to, 'Must include verifyOptions.to when calling user.verify() ' +
      'or the user must have an email property');
    assert(verifyOptions.from, 'Must include verifyOptions.from when calling user.verify()');
    assert(typeof verifyOptions.templateFn === 'function',
      'templateFn must be a function');
    assert(typeof verifyOptions.generateVerificationToken === 'function',
      'generateVerificationToken must be a function');
    assert(verifyOptions.mailer, 'A mailer function must be provided');
    assert(typeof verifyOptions.mailer.send === 'function', 'mailer.send must be a function ');
  }

  function createVerificationEmailBody(verifyOptions, options, cb) {
    var template = loopback.template(verifyOptions.template);
    var body = template(verifyOptions);
    cb(null, body);
  }

  /**
   * A default verification token generator which accepts the user the token is
   * being generated for and a callback function to indicate completion.
   * This one uses the crypto library and 64 random bytes (converted to hex)
   * for the token. When used in combination with the user.verify() method this
   * function will be called with the `user` object as it's context (`this`).
   *
   * @param {object} user The User this token is being generated for.
   * @param {object} options remote context options.
   * @param {Function} cb The generator must pass back the new token with this function call.
   */
  User.generateVerificationToken = function (user, options, cb) {
    crypto.randomBytes(64, function (err, buf) {
      cb(err, buf && buf.toString('hex'));
    });
  };


};
function joinUrlPath(args) {
  var result = arguments[0];
  for (var ix = 1; ix < arguments.length; ix++) {
    var next = arguments[ix];
    result += result[result.length - 1] === '/' && next[0] === '/' ?
      next.slice(1) : next;
  }
  return result;
}