'use strict';

module.exports = function (Coursecandidate) {
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
};
