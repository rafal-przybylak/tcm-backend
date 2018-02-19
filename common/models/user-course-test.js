'use strict';

module.exports = function (Usercoursetest) {

    Usercoursetest.evaluate = function (userTestIds, callback) {

        Usercoursetest.find({ where: { id: { inq: userTestIds } }, include: [{ courseTest: 'test' }, 'userAnswers'] }, async function (err, userTests) {
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
}
    