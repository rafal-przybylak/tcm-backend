'use strict';

module.exports = function (Test) {

    Test.observe('before delete', function (ctx, next) {

        Test.beginTransaction('READ COMMITTED', async function (err, tx) {
            try {
                var wynik = await Test.app.models.testQuestion.find({ where: { testId: ctx.where.id } }, { transaction: tx }); //function (err, questions) {

                for (let element of wynik) {
                    await Test.app.models.userAnswer.destroyAll({ questionId: element.id }, { transaction: tx });
                };

                await Test.app.models.testQuestion.destroyAll({ testId: ctx.where.id }, { transaction: tx });

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
     // Test.observe('before delete', async function (ctx, next) {

        //     try {
        //         await Test.app.dataSources.mssql2008.transaction(async models => {

        //           await models.Role.create({name: 'testowa'});
        //              await models.testQuestion.find({ where: { testId: ctx.where.id } }, async  function (err, questions) {

        //                 if (questions && err == null) {
        //                     questions.forEach(element => {

        //                          await Test.app.models.userAnswer.destroyAll({ questionId: element.id }, function (err) {
        //                             if (err)
        //                                 console.log("Error: " + err);
        //                         });
        //                     });
        //                 }

        //             });
        //             await models.testQuestion.destroyAll({ testId: ctx.where.id }, function (err) {
        //                 if (err)
        //                     console.log("Error: " + err);
        //             });
        //             //throw new Error('test error');
        //         });
        //         next();
        //     } catch (e) {
        //         console.log(e); // Oops
        //         next(e);
        //     }
};
