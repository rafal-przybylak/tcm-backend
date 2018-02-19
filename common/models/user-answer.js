'use strict';

module.exports = function (Useranswer) {

    Useranswer.observe('before save', function (ctx, next) {
        let score;
        let obj;
        if(ctx.instance){
            obj=ctx.instance;
        }else{
            obj=ctx.data;
        }
        if(obj.questionId){
        Useranswer.app.models.testQuestion.findById(obj.questionId, function (err, questions) {
            if (err) console.log("Error: " + err);
            let answer = true;
            if (questions && !questions.isOpen && questions.correctAnswer) {
                if (questions.correctAnswer.length == obj.value.length) {
                    answer = !questions.correctAnswer.some(element => {
                        return !obj.value.some(ans => ans == element);
                    });
                } else {
                    answer = false;
                }
                if (answer) {
                    obj.score = questions.maxScore;
                    obj.evaluationDt = new Date();
                    next();
                } else {
                    obj.score = 0;
                    obj.evaluationDt = new Date();
                    next();
                }

            }else{
                next();
            }
        });
    }else{
        next();
    }
        

    });
};
