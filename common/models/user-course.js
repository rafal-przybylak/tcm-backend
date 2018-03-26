'use strict';
var loopback = require('loopback');
var path = require('path');
var moment = require('moment');
moment.locale('pl')
module.exports = function(UserCourse) {
    UserCourse.observe('after save', function(ctx, next) {
        var registry = UserCourse.registry;
        var options = {
            subject: "Szkolenia MM Poland - Powiadomienie uczestnictwa w szkoleniu",
            from: "Szkolenia MM Poland <szkolenia@mmpoland.pl>",
            type: "email",
            email: registry.getModelByType(loopback.Email),
           
            template:""
        };
        //var message="";
            options.subject= "Szkolenia MM Poland - Powiadomienie o uczestnictwie w szkoleniu";
            UserCourse.app.models.user.findById(ctx.instance.userId,function (err,user){
                options.to=user.email;
                UserCourse.app.models.course.findById(ctx.instance.courseId,function (err,course){
                    options.courseName = course.name + " w dniach " + moment(course.startDt).format('LL') + " - " + moment(course.endDt).format('LL');
                     var template = loopback.template(path.join(__dirname, "..", "..", "server", "views", "user_course_accept.ejs"));
                     var body = template(options);
                     setHtmlContentAndSend(options, body);
                });
            });
        next();
      });
      UserCourse.observe('after delete', function(ctx, next) {
        var registry = UserCourse.registry;
        var options = {
            subject: "Szkolenia MM Poland - Powiadomienie o uczestnictwie w szkoleniu",
            from: "Szkolenia MM Poland <szkolenia@mmpoland.pl>",
            type: "email",
            email: registry.getModelByType(loopback.Email),
            to:"szkolenia@mmpoland.pl"
        };
            options.subject= "Szkolenia MM Poland - Powiadomienie o odrzuceniu uczestnictwa w szkoleniu";
            UserCourse.app.models.user.findById(ctx.where.userId,function (err,user){
                options.to=user.email;
                UserCourse.app.models.course.findById(ctx.where.courseId,function (err,course){
                    options.courseName = course.name + " w dniach " + moment(course.startDt).format('LL') + " - " + moment(course.endDt).format('LL');
                    var template = loopback.template(path.join(__dirname, "..", "..", "server", "views", "user_course_reject.ejs"));
                    var body = template(options);
                     setHtmlContentAndSend(options, body);
                });
            });
        next();
      });

      function setHtmlContentAndSend(options, html) {
        options.html = html;
        delete options.template;
        var Email = options.email;
        if (Email.send.length == 3) {
            Email.send(options, {}, handleAfterSend);
        } else {
             Email.send(options, handleAfterSend); 
        }

        function handleAfterSend(err, email) {

           if(err) console.log(err);


        }
    }
};
