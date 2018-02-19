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
                // var tests = await Course.app.models.courseTest.find({ where: { courseId: ctx.where.id } }, { transaction: tx }); //function (err, questions) {

                // for (let element of tests) {
                //     var wynik = await Course.app.models.userCourseTest.find({ where: { courseTestId: element.id } }, { transaction: tx }); //function (err, questions) {

                //         for (let uCTest of wynik) {
                //             await Course.app.models.userAnswer.destroyAll({ userCourseTestId: uCTest.id }, { transaction: tx });
                //         };
        
                //         await Course.app.models.userCourseTest.destroyAll({ courseTestId: element.id }, { transaction: tx });

                // };
                await Course.app.models.courseTest.destroyAll({ courseId: ctx.where.id }, { transaction: tx });
                await Course.app.models.userCourse.destroyAll({ courseId: ctx.where.id }, { transaction: tx });
                await Course.app.models.courseCandidate.destroyAll({ courseId: ctx.where.id }, { transaction: tx },ctx.options);
                await Course.app.models.trainerCourse.destroyAll({ courseId: ctx.where.id }, { transaction: tx });
                await Course.app.models.mediaLink.destroyAll({ refId: ctx.where.id,refType:"course" }, { transaction: tx });
               
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
