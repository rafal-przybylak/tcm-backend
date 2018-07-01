


'use strict';
var loopback = require('loopback');
var path = require('path');
var moment = require('moment');
var async = require("async");
moment.locale('pl');
module.exports = function (Usercoursetest) {
    Usercoursetest.createOptionsFromRemotingContext = function (ctx) {
        var base = this.base.createOptionsFromRemotingContext(ctx)
        base.ctx = ctx.req
        return base
      }
    Usercoursetest.observe('before save', function (ctx, next) {
        let userId;
        if (ctx.data) {
            userId = ctx.data.userId;
        } else {
            userId = ctx.instance.userId;
        }
        if (!ctx.options.authorizedRoles || ctx.options.authorizedRoles.$owner ||ctx.options.authorizedRoles.administrator || userId == ctx.options.accessToken.userId) {
            next();
        } else {
            next("Only owner can create user-test relation for course.");
        }
    });
    Usercoursetest.evaluate = function (userTestIds, callback) {
        if (Array.isArray(userTestIds[0]) || userTestIds[0] instanceof Object) { userTestIds = userTestIds[0] };
        Usercoursetest.find({ where: { id: { inq: userTestIds } }, include: [{ courseTest: ['test'] }, 'userAnswers'] }, async function (err, userTests) {
            let testArray = [];
            for (let element of userTests) {

                let userTest = element.toObject();
                if (userTest.userAnswers.length > 0) {
                    userTest.score = userTest.userAnswers.map(x => x.score).reduce((a, b) => { return a + b; })

                    userTest.scorePercent = userTest.courseTest.test.maxScore ? (userTest.score / userTest.courseTest.test.maxScore) * 100 : null;
                    userTest.passed = userTest.score - userTest.courseTest.passingScore >= 0;
                    userTest.checkDt = new Date();
                    userTest = await Usercoursetest.upsert(userTest);
                    userTest = userTest.toObject();
                }
                testArray.push(userTest);
            }
            callback(null, testArray);
        }
        );
    };
    Usercoursetest.sendEvaluateMessage = function (userTestIds, callback) {

        var registry = Usercoursetest.registry;
        var goptions = {
            subject: "Szkolenia MM Poland - wyniki z egzaminu",
            from: "Szkolenia MM Poland <szkolenia@mmpoland.pl>",
            type: "email",
            email: registry.getModelByType(loopback.Email)
        };
        

        if (Array.isArray(userTestIds[0]) || userTestIds[0] instanceof Object) { userTestIds = userTestIds[0] };
        Usercoursetest.find({ where: { id: { inq: userTestIds } }, include: [{ courseTest: ['test', 'course'] }, 'user'] }, async function (err, userTests) {
            let sentArray = [];
            async.eachSeries(userTests, function (result, loopCallback) {
                var element = result.toObject();
                var options = Object.assign({}, goptions);
                options.passed = element.passed;
                options.wynik = element.passed ? "pozytywny" : "negatywny";
                options.courseName = element.courseTest.course.name + " w dniach " + moment(element.courseTest.course.startDt).format('LL') + " - " + moment(element.courseTest.course.endDt).format('LL');
                options.wynikProcent = element.scorePercent ? element.scorePercent : 0;
                options.to = element.user.email;
                var template = loopback.template(path.join(__dirname, "..", "..", "server", "views", "test_evaluation.ejs"));
                var body = template(options);
                //loopCallback();
                setHtmlContentAndSend(options, body, sentArray, loopCallback);

            }, err => {
                if (err) console.log(err.message);
                callback(err, sentArray);
            });

        }
        );
    };
    Usercoursetest.sendExamReminder = function (courseTestId, callback) {

        var registry = Usercoursetest.registry;
        var goptions = {
            subject: "Szkolenia MM Poland - przypomnienie o egzaminie",
            from: "Szkolenia MM Poland <szkolenia@mmpoland.pl>",
            type: "email",
            email: registry.getModelByType(loopback.Email)
        };
        

        Usercoursetest.find({ where: { completeDt: null, courseTestId: courseTestId }, include: [{ courseTest: ['course'] }, 'user'] }, async function (err, userTests) {
            let sentArray = [];
            async.eachSeries(userTests, function (result, loopCallback) {
                var element = result.toObject();
                var options = Object.assign({}, goptions);
                options.courseName = element.courseTest.course.name + " w dniach " + moment(element.courseTest.course.startDt).format('LL') + " - " + moment(element.courseTest.course.endDt).format('LL');
                options.to = element.user.email;
                var template = loopback.template(path.join(__dirname, "..", "..", "server", "views", "test_remainder.ejs"));
                var body = template(options);

                setHtmlContentAndSend(options, body, sentArray, loopCallback);

            }, err => {
                if (err) console.log(err.message);
                callback(err, sentArray);
            });

        }
        );
    };
    function setHtmlContentAndSend(options, html, sentArray, callback) {
        options.html = html;
        delete options.template;
        var Email = options.email;
        if (Email.send.length == 3) {
            setTimeout(() => { return Email.send(options, {}, handleAfterSend); }, 1000);
        } else {
            setTimeout(() => { return Email.send(options, handleAfterSend); }, 1000);
        }

        // if (Email.send.length == 3) {
        //     setTimeout(() => { return  handleAfterSend(null,null); }, 3000);
        // } else {
        //     setTimeout(() => { return handleAfterSend(null,null); }, 3000);
        // }
        function handleAfterSend(err, email) {

            sentArray.push({ sentError: err, sentData: options, scorePercent: options.wynikProcent, passed: options.passed });
            callback();


        }
    }
}
