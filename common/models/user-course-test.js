

'use strict';
var loopback = require('loopback');
var path = require('path');
var moment = require('moment');
moment.locale('pl');
module.exports = function (Usercoursetest) {

    Usercoursetest.evaluate = function (userTestIds, callback) {
        if(Array.isArray(userTestIds[0]))  {userTestIds=userTestIds[0]};
        Usercoursetest.find({ where: { id: { inq: userTestIds } }, include: [{ courseTest: ['test'] }, 'userAnswers'] }, async function (err, userTests) {
            let testArray=[];
            for (let element of userTests) {

                let userTest = element.toObject();
                if (userTest.userAnswers.length>0) {
                    userTest.score = userTest.userAnswers.map(x => x.score).reduce((a, b) => { return a + b; })

                    userTest.scorePercent = userTest.courseTest.test.maxScore ? (userTest.score / userTest.courseTest.test.maxScore) * 100 : null;
                    userTest.passed = userTest.score - userTest.courseTest.passingScore >= 0;
                    userTest.checkDt=new Date();
                    userTest = await Usercoursetest.upsert(userTest);
                    userTest=userTest.toObject();
                }
                testArray.push(userTest);
            }
            callback(null, testArray);
        }
        );
    };
    Usercoursetest.sendEvaluateMessage = function (userTestIds, callback) {
        
        var registry = Usercoursetest.registry;
        var options = {
            subject: "Szkolenia MM Poland - wyniki z egzaminu",
            from: "Szkolenia MM Poland <szkolenia@mmpoland.pl>",
            type: "email",
            email:registry.getModelByType(loopback.Email)
          };
          var model = this.constructor;
          var registry = model.registry;

        if(Array.isArray(userTestIds[0]))  {userTestIds=userTestIds[0]};
        Usercoursetest.find({ where: { id: { inq: userTestIds } }, include: [{ courseTest: ['test','course'] }, 'userAnswers','user'] }, async function (err, userTests) {
            let sentArray=[];
            for (let element of userTests) {
                element = element.toObject();
                options.passed=element.passed;
                options.wynik=element.passed?"pozytywny":"negatywny";
                options.courseName=element.courseTest.course.name+ " w dniach "+moment(element.courseTest.course.startDt).format('LL') + " - "+moment(element.courseTest.course.endDt).format('LL');
                options.wynikProcent=element.scorePercent;
                options.to=element.user.email;
                var template = loopback.template(path.join(__dirname, "..", "..", "server", "views", "test_evaluation.ejs"));
                var body = template(options);
                setHtmlContentAndSend(options,body,sentArray,callback);

                
                
            }
            callback(null, sentArray);
        }
        );
    };
    function setHtmlContentAndSend(options,html,sentArray,callback) {
      

        options.html = html;

        // Remove verifyOptions.template to prevent rejection by certain
        // nodemailer transport plugins.
        delete options.template;

       
        var Email = options.email;
        if (Email.send.length == 3) {
          Email.send(options, {}, handleAfterSend);
        } else {
          Email.send(options, handleAfterSend);
        }

        function handleAfterSend(err, email) {
          if (err) return callback(err);
          sentArray.push( { email: email, scorePercent: options.wynikProcent,passed:options.passed});
        }
      }
}
    