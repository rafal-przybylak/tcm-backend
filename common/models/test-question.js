'use strict';

module.exports = function (Testquestion) {
    Testquestion.observe('before delete', function (ctx, next) {

        Testquestion.beginTransaction('READ COMMITTED', async function (err, tx) {
           
            try {
                await Testquestion.app.models.userAnswer.destroyAll({ questionId: ctx.where.id }, { transaction: tx });
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
