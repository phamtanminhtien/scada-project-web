var URL = "Script/StartOpti.json";

const deployValues = (e) => {
  console.log(e);
};

$.init = function () {
  S7Framework.initialize("1500", "");

  S7Framework.readData(URL, "init read data", deployValues);
};

$(document).ready(function () {
  $.init();
});
