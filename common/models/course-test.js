'use strict';

module.exports = function(CourseTest) {
    CourseTest.createOptionsFromRemotingContext = function (ctx) {
        var base = this.base.createOptionsFromRemotingContext(ctx)
        base.ctx = ctx.req
        return base
      }
    CourseTest.observe('before delete', function (ctx, next) {

        CourseTest.beginTransaction('READ COMMITTED', async function (err, tx) {
            try {
                var wynik = await CourseTest.app.models.userCourseTest.find({ where: { courseTestId: ctx.where.id } }, { transaction: tx }); //function (err, questions) {

                for (let element of wynik) {
                    await CourseTest.app.models.userAnswer.destroyAll({ userCourseTestId: element.id }, { transaction: tx });
                };

                await CourseTest.app.models.userCourseTest.destroyAll({ courseTestId: ctx.where.id }, { transaction: tx });

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
