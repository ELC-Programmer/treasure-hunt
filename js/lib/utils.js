/**
 * @function getUrlParameter
 * Retrieve GET parameters from the window.location.
 * @param sParam The name of the GET parameter to look for.
 * @returns The string value of the param, if applicable, true if the param exists without a value, or false if the param is not found at all.
 */
var getUrlParameter = function getUrlParameter(sParam) {
    var sPageURL = decodeURIComponent(window.location.search.substring(1)),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;

    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');

        if (sParameterName[0] === sParam) {
            return sParameterName[1] === undefined ? true : sParameterName[1];
        }
    }
	return false;
};