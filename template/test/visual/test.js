gemini.suite('create-lit-element', function(rootSuite) {
  function wait(actions, find) {
    actions.wait(5000);
  }

  rootSuite
    .before(wait);

    gemini.suite(`default-tests`, function(suite) {
      suite
        .setUrl(`default.html?`)
        .setCaptureElements('#default-tests')
        .capture(`create-lit-element`);
    });

});
