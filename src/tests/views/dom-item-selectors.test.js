import { spyneDocsDomStr } from '../mocks/spyne-docs.mocks';
import { DomItemSelector, generateEl } from '../../spyne/views/dom-item-selector';

import * as R from 'ramda';

describe('Dom Item Selector', () => {
  beforeEach(function() {
    document.body.insertAdjacentHTML('afterbegin', spyneDocsDomStr);
  }
  );

  // remove the html fixture from the DOM
  afterEach(function() {
    document.body.removeChild(document.getElementById('app'));
  });

  it('should return the same el', ()=>{
    let el = document.querySelector("ul#my-list");
    let elNode = DomItemSelector(el);
    let elNodesEqual = el.isEqualNode(elNode.el);
     expect(elNodesEqual).to.eq(true);
  });

  it('should return the same el from selector', ()=>{
    let el = document.querySelector("ul#my-list");
    let el$ = DomItemSelector("ul#my-list");
    let elNodesEqual = el.isEqualNode(el$.el);
     expect(elNodesEqual).to.eq(true);
  });


  it('should return local li', () => {
    let el = document.querySelector("ul#my-list");
    let el$ =   DomItemSelector("ul#my-list");
    let liList = el$('li');
    expect(liList.el.length).to.eq(5);
  });
  it('should add class to li', () => {
    let el = document.querySelector("ul#my-list");
    let el$ =   DomItemSelector("ul#my-list");
    let liList = el$('li');
    liList.addClass('foo');
    let hasFooClassBool = liList.el[0].classList.contains('foo');
    expect(hasFooClassBool).to.eq(true);
  });

  it('should remove class to li', () => {
    let el = document.querySelector("ul#my-list");
    let el$ =   DomItemSelector("ul#my-list");
    let liList = el$('li');
    liList.removeClass('has-svg');
    let hasSvgClassBool = liList.el[0].classList.contains('has-svg');
    expect(hasSvgClassBool).to.eq(false);
  });


  it('should set class foo bar', () => {
    let el = document.querySelector("ul#my-list");
    let el$ =   DomItemSelector("ul#my-list");
    let liList = el$('li');
    liList.setClass('foo bar');
    let isFooBarClassBool = liList.el[0].classList.value === 'foo bar';
    expect(isFooBarClassBool).to.eq(true);
  });


  it('should add inline css', () => {
    let el = document.querySelector("ul#my-list");
    let el$ =   DomItemSelector("ul#my-list");
    let liList = el$('li');
    liList.inlineCss = 'background:orange;';
    let backgroundSetBool = liList.el[0].style.getPropertyValue('background') === 'orange';
    expect(backgroundSetBool).to.eq(true);
  });

  it('should add toogle Class', () => {
    let el = document.querySelector("ul#my-list");
    let el$ =   DomItemSelector("ul#my-list");
    let liList = el$('li');
    liList.toggleClass('foo', true);
    let hasFooClassBool = liList.el[0].classList.contains('foo');
    expect(hasFooClassBool).to.eq(true);
  });





});
