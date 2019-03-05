const R = require('ramda');

export class URLUtils {
  constructor() {
    this.checkIfObjIsNotEmptyOrNil = URLUtils.checkIfObjIsNotEmptyOrNil.bind(this);
  }

  static checkIfObjIsNotEmptyOrNil(obj) {
    const isNotEmpty = R.compose(R.complement(R.isEmpty), R.head, R.values);
    const isNotNil = R.compose(R.complement(R.isNil), R.head, R.values);
    const isNotNilAndIsNotEmpty = R.allPass([isNotEmpty, isNotNil]);
    return isNotNilAndIsNotEmpty(obj);
  }

  static checkIfParamValueMatchesRegex(paramValue, routeObj) {
    const rejectParamKey = R.reject(R.equals('routeName'));
    const keysArr = R.compose(rejectParamKey, R.keys);
    const testForRegexMatch = str => R.test(new RegExp(str), paramValue);
    const checker = R.compose(R.find(testForRegexMatch), keysArr);
    const regexMatchStr = checker(routeObj);
    if (R.is(String, regexMatchStr)) {
      routeObj = R.assoc(paramValue, R.prop(regexMatchStr, routeObj), routeObj);
    }
    return routeObj;
  }

  static formatStrAsWindowLocation(str){
    const hash = str;
    const search = str;
    const pathname = str;
    return {hash,search,pathname};

  }

  static getLocationStrByType(t, isHash = false, loc=window.location) {
    const type = isHash === true ? 'hash' : t;

    const typeMap = {
      'slash': 'pathname',
      'query': 'search',
      'hash': 'hash'
    };
    const prop = typeMap[type];
    let str  = R.prop(prop, loc);
    let checkForSlashAndHash = /^(\/)?(#)?(\/)?(.*)$/;
    console.log("DATA LOC STR ",{str, loc, prop, type,isHash});
    return str.replace(checkForSlashAndHash, '$4');
  }

  static createRouteArrayFromParams(data, route, t = 'slash', paramsFromLoc) {
    let urlArr = [];
    let loopThroughParam = (routeObj) => {
      let urlObj = {};
      let keyword = routeObj.routeName; // PARAM FORM SPYNE CONFIG
      let paramValFromData = data[keyword] !== undefined ? data[keyword] : R.prop(keyword, paramsFromLoc); // PULL VALUE FOR THIS PARAM FROM DATA
      const paramValType = typeof (routeObj[paramValFromData]);
      // console.log({routeObj, paramValType, paramValFromData, keyword})

      if (paramValType === 'string') {
        paramValFromData = routeObj[paramValFromData];
      } else if (paramValType === 'undefined') {
        routeObj = this.checkIfParamValueMatchesRegex(paramValFromData, routeObj);
      }

      urlObj[keyword] = paramValFromData;

      // console.log("URL OBJ ",urlObj);
      if (this.checkIfObjIsNotEmptyOrNil(urlObj)) {
        // console.log("FOUND ",{paramValFromData, paramValType, urlObj, routeObj});
        urlArr.push(urlObj);
      } else {
        // console.log("NOT FOUND ",paramValFromData, paramValType, urlObj, routeObj);

      }

      const isObject = R.is(Object, routeObj);
      const objectParamExists = R.has(paramValFromData, routeObj);
      const objectContainsRoute = R.has('routePath', routeObj);
      const recursivelyCallLoopBool = objectParamExists && isObject;
      // console.log("CHECKS ", {isObject, objectParamExists, objectContainsRoute, recursivelyCallLoopBool})
      if (recursivelyCallLoopBool === true) {
        let newObj = routeObj[paramValFromData];
        // console.log("NEW OBJ ",{paramValFromData, routeObj, newObj});
        if (R.has('routePath', newObj)) {
          loopThroughParam(newObj.routePath);
        }
      } else if (objectContainsRoute === true && paramValFromData !== undefined) {
        loopThroughParam(routeObj.routePath);
      }
    };

    loopThroughParam(route);

    return urlArr;
  }

  static createSlashString(arr) {

    const removeRegex = str => str.replace(/^(\W*)(.*?)(\W*)$/g, "$2");
    const cleanVals = R.map(removeRegex, R.values);

    /**
     * TODO: CREATE ARRAYS OR REGEX OPTIONS FOR PARSING PARAMS INTO ROUTE STRING
     *
     */


    const arrClear = R.reject(R   .isNil);
    const notUndefined = R.when(R.complement(R.isNil, R.__), R.join('/'));

    const joiner = R.compose(notUndefined, arrClear, R.flatten,
      R.map(R.values));

    let joinerArr = joiner(arr);
    return joiner(arr);
  }

  static createQueryString(arr) {
    const arrClear = R.reject(R.isNil);

    const isNotNilAndIsNotEmpty = this.checkIfObjIsNotEmptyOrNil;

    const createPair = R.compose(
      R.join('='),
      R.flatten,
      R.toPairs);

    const checkPair = R.ifElse(
      isNotNilAndIsNotEmpty,
      createPair,
      R.always(undefined)
    );

    const mapArrayOfPairs = R.map(checkPair);

    const checkIfStrIsEmpty = R.when(
      R.complement(R.isEmpty),
      R.concat('?'));

    const createQs = R.compose(
      checkIfStrIsEmpty,
      R.join('&'),
      arrClear,
      mapArrayOfPairs);

    return createQs(arr);
  }

  static convertParamsToRoute(data, r = window.Spyne.config.channels.ROUTE, t, locStr) {
    const urlType = t !== undefined ? t : r.type;
    const isHash = r.isHash;
    let route = r.routes.routePath;
    let locationStr = locStr !== undefined ? locStr : this.getLocationStrByType(urlType, isHash);
    let paramsFromCurrentLocation = this.convertRouteToParams(locationStr, r, urlType).keywords;

    let urlArr = this.createRouteArrayFromParams(data, route, urlType, paramsFromCurrentLocation);
    // THIS CREATES A QUERY PATH STR
    if (urlType === 'query') {
      return this.createQueryString(urlArr);
    }

    // THIS CREATES A SLASH PATH STR
    return this.createSlashString(urlArr);
  }

  static checkIfValueShouldMapToParam(obj, str) {
    let invertedObj = R.invert(obj);

    let checkIfValMapsToParam = R.compose(R.is(String), R.head, R.defaultTo([]), R.prop(str));
    const reFn = s => new RegExp(s);
    let pred = R.test(reFn(R.__), str);
      //console.log('str is ',str);
      let testStr  = R.test(R.__, str);

      // GO THROUGH KEYS AND CHECK IF REGEX MATCHES

    // CHECKS IF STRING IS EMPTY AS IN FOR HOME PAGE
    let checkForEmpty =  R.replace(/^$/, '^$');
    //const getKeyIfObject = R.ifElse(R.filter(R.is(Object)), R.key)

    // GO THROUGH ROUTE CONFIG TO FIGURE OUT IF VAL OR KEY SHOULD BE COMPARED
    const getValCompareArr = R.compose( R.map(R.last), R.map(R.filter(R.is(String))),  R.toPairs);

    // CREATE THE ARRAY OF EITHER VALS OR KEYS
    let paramsArr = getValCompareArr(obj);

    //const testKeyMatch = s => R.test(reFn(`^${s}$`), str);
   // const returnStrIfMatch = R.ifElse(testKeyMatch, R.identity, R.always(str));


    // SEE IF CURRENT ROUTE STRING MATCHES ANY OF THE VALUES OR KEYS
    let checkForParamsMatch = R.compose(  R.findLastIndex(R.equals(true)), R.map(testStr),  R.map(reFn), R.map(checkForEmpty));
    //R.findIndex(R.equals(true), temp1)

    // RESULTS FROM PARAM CHECK
    let paramIndex = checkForParamsMatch(paramsArr);

    // DEFAULT VAL FOR STRING
    let paramStr = str;

    // LEGACY METHOD -- TURN OFF
    // =========================================
    let getParam = R.compose(R.head, R.prop(str));
    const strCheck = R.ifElse(
        checkIfValMapsToParam,
        getParam,
        R.always(str)
    );

    let origParam = strCheck(invertedObj);

    // ===============================================

    if (paramIndex>=0){
      let param = paramsArr[paramIndex];

      // PULL INVERTED OBJECT TO SEE IF STR MATCHES
      let getParamInverted = R.compose(R.head, R.defaultTo([]), R.prop(param));
      let paramInverted = getParamInverted(invertedObj);
      let re =  /^(\w*)$/;
      let keyMatch =  re.test(paramInverted);;


      if (keyMatch === true && R.is(String, paramInverted)===true){
        paramStr = paramInverted;
      }

    }


    //console.log("PARAM IS NOW ",{paramStr,origParam,invertedObj,obj,str});




    //console.log("C2: ",{paramIndex,paramStr, paramsArr},strCheck(invertedObj));

    //console.log({paramIndex,str},obj," C2 IS ", strCheck(invertedObj));
    //console.log("CHECK PARAM ",{invertedObj, c2,str},strCheck(invertedObj));
    return paramStr;// strCheck(invertedObj);
  }

  static createArrFromSlashStr(str) {
    const slashRe = /^([/])?(.*)$/;
    return str.replace(slashRe, '$2').split('/');
  }

  static convertSlashRouteStrToParamsObj(topLevelRoute, str) {
    const routeValue = str;
    let valuesArr = this.createArrFromSlashStr(str);
    let paths = [];
    let routedValuesArr = [];
    let latestObj = topLevelRoute;
    let createParamsFromStr = (total, currentValue) => {
      let routeValueStr = this.checkIfValueShouldMapToParam(latestObj, currentValue);

      latestObj = this.checkIfParamValueMatchesRegex(currentValue, latestObj);

      if (latestObj !== undefined) {
        paths.push(latestObj.routeName);
        routedValuesArr.push(routeValueStr);
      }
      let strPath = [currentValue, 'routePath'];
      let routeParamPath = ['routePath'];
      let objectFromStr = R.path(strPath, latestObj);
      let objectFromRouteParam = R.path(routeParamPath, latestObj);

      if (objectFromStr !== undefined) {
        latestObj = objectFromStr;
      } else if (objectFromRouteParam !== undefined) {
        latestObj = objectFromRouteParam;
      }
    };

    R.reduce(createParamsFromStr, 0, valuesArr);
    let keywords = R.zipObj(paths, routedValuesArr);
    const routeKeyword = this.getLastArrVal(paths);
    return {paths, routeKeyword, keywords, routeValue};
  }

  static getLastArrVal(arr) {
    const getLastParam = (a) => R.last(a) !== undefined ? R.last(a) : '';
    return getLastParam(arr);
  }

  static createDefaultParamFromEmptyStr(topLevelRoute, str) {
    let obj = {};
    let keyword = topLevelRoute.routeName;
    obj[keyword] = this.checkIfValueShouldMapToParam(topLevelRoute, str);
    return obj;
  }

  static convertQueryStrToParams(topLevelRoute, str) {
    const queryRe = /^([?])?(.*)$/;
    const routeValue = str;
    let strArr = str.replace(queryRe, '$2');
    let convertToParams = R.compose(R.map(R.split('=')), R.split('&'));
    let paramsArr = convertToParams(strArr);
    let keywords = R.fromPairs(paramsArr);

    let paths = R.map(R.head, paramsArr);

    if (R.isEmpty(str) === true) {
      keywords = this.createDefaultParamFromEmptyStr(topLevelRoute, str);
      paths = R.keys(keywords);
    }
    let routeKeyword = this.getLastArrVal(paths);

    return {paths, routeKeyword, keywords, routeValue};
  }

  static convertRouteToParams(str, routeConfig, t) {
    if (routeConfig === undefined) {
      return {};
    }
    const type = t !== undefined ? t : routeConfig.type;
    let topLevelRoute = routeConfig.routes.routePath;

    if (type === 'query') {
      return this.convertQueryStrToParams(topLevelRoute, str);
    }

    return this.convertSlashRouteStrToParamsObj(topLevelRoute, str);
  }
}
