'use strict';

module.exports = function (Course) {
    // Course.observe('access', function(ctx, next) {
    //     const token = ctx.options && ctx.options.accessToken;
    //     const userId = token && token.userId;
    //     const user = userId ? 'user#' + userId : '<anonymous>';

    //     const modelName = ctx.Model.modelName;
    //     const scope = ctx.where ? JSON.stringify(ctx.where) : '<all records>';
    //     console.log('%s: %s accessed %s:%s', new Date(), user, modelName, scope);
    //     next();
    //   });

    Course.observe('before delete', function (ctx, next) {

        Course.beginTransaction('READ COMMITTED', async function (err, tx) {
            try {
                var tests = await Course.app.models.test.find({ where: { courseId: ctx.where.id } }, { transaction: tx }); //function (err, questions) {

                for (let element of tests) {

                    var questions = await Course.app.models.testQuestion.find({ where: { testId: element.id } }, { transaction: tx });
                    for (let quest of questions) {
                        await Course.app.models.userAnswer.destroyAll({ questionId: quest.id }, { transaction: tx });
                    }
                    await Course.app.models.testQuestion.destroyAll({ testId: element.id }, { transaction: tx });
                };
                await Course.app.models.test.destroyAll({ courseId: ctx.where.id }, { transaction: tx });
                await Course.app.models.userCourse.destroyAll({ courseId: ctx.where.id }, { transaction: tx });
                tx.commit(function (err) { next(err) });

            } catch (e) {
                tx.rollback(function (err) {
                    console.log("TX rollback error: " + e);
                });

                console.log(e); // Oops
                next(e);
            }
        });
    });
};
