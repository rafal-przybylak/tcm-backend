'use strict';
var loopback = require('loopback');
var path = require('path');
var moment = require('moment');
moment.locale('pl')
module.exports = function (Coursecandidate) {
    
    Coursecandidate.createOptionsFromRemotingContext = function (ctx) {
        var base = this.base.createOptionsFromRemotingContext(ctx)
        base.ctx = ctx.req
        return base
      }
    Coursecandidate.observe('before save', function (ctx, next) {
        let userId;
        if (ctx.data) {
            userId = ctx.data.userId;
        } else {
            userId = ctx.instance.userId;
        }
        if (!ctx.options.authorizedRoles || ctx.options.authorizedRoles.$owner || userId == ctx.options.accessToken.userId) {
            next();
        } else {
            next("Only owner can create candidate for course.");
        }
    });
    Coursecandidate.observe('after save', function(ctx, next) {
        var registry = Coursecandidate.registry;
        var options = {
            subject: "Szkolenia MM Poland - Powiadomienie o zgłoszeniu na szkolenie",
            from: "Szkolenia MM Poland <szkolenia@mmpoland.pl>",
            type: "email",
            email: registry.getModelByType(loopback.Email),
            to:"szkolenia@mmpoland.pl"

        };
        
        var message="";
        if (ctx.isNewInstance) {
            options.subject= "Szkolenia MM Poland - Powiadomienie o zgłoszeniu na szkolenie";
            Coursecandidate.app.models.user.findById(ctx.instance.userId,function (err,user){
                Coursecandidate.app.models.course.findById(ctx.instance.courseId,function (err,course){
                    var coursName = course.name + " w dniach " + moment(course.startDt).format('LL') + " - " + moment(course.endDt).format('LL');
                     message= "Użytkownik "+ user.firstName+" "+user.lastName+" ("+user.email+") zgłosił się na szkolenie: "+coursName+". Informacja od użytkownika: "+ctx.instance.desc;
                     setHtmlContentAndSend(options, message);
                });
            });
       
          
      
        } else {
            options.subject= "Szkolenia MM Poland - Powiadomienie o rezygnacji ze szkolenia";
            Coursecandidate.app.models.user.findById(ctx.instance.userId,function (err,user){
                Coursecandidate.app.models.course.findById(ctx.instance.courseId,function (err,course){
                    var coursName = course.name + " w dniach " + moment(course.startDt).format('LL') + " - " + moment(course.endDt).format('LL');
                     message= "Użytkownik "+ user.firstName+" "+user.lastName+" ("+user.email+") zrezygnował ze szkolenia: "+coursName+". Powód rezygnacji: "+ctx.instance.cancelledInfo;
                     setHtmlContentAndSend(options, message);
                });
            });
        }
        
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
