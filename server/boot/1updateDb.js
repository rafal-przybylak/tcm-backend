module.exports = function(app) {

   var dataSource = app.dataSources.mssql2008;       
    // dataSource.automigrate(['user','AccessToken','ACL','RoleMapping','Role'], function (err) {
    //     if(err) return console.log(err);
    //     console.log('Models created: \n');
    // });  
    app.dataSources.mssql2008.autoupdate(['user','AccessToken','ACL','Role','course','userCourse','userData','test','testQuestion','userAnswer',    'courseScope','trainerCourse','courseTest','userCourseTest','trainerCourseScope','courseCandidate']
    , function(err) {
      if (err) throw err;
        console.log('Models updated: \n');
     });
  };