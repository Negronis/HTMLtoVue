const jsdom = require("jsdom");
const fs = require("fs");
const {JSDOM} = jsdom;

const dictionary = {
    "hs-pdf-form-top-name": "detailData['name'] || ''",
    "hs-pdf-form-top-gender": "detailData['sex'] || ''",
    "hs-pdf-form-top-age": "detailData['age'] || ''",
    "hs-pdf-form-top-mz": "detailData['MZH'] || ''",
    "hs-pdf-form-top-YangBenCaiJiShiJian": "detailData['sapmpling_time'] || ''",
    "hs-pdf-footer-phy": "中昊",
    "hs-pdf-footer-col": "detailData['sapmpling_time'] || ''",
    "hs-pdf-footer-rec": "detailData['receive_time'] || ''",
    "hs-pdf-footer-rep": "detailData['report_time'] || ''",
    "hs-pdf-table-bottom-note": "detailData['Remark'] || ''",
    "hs-pdf-table-bottom-idcard": "detailData['idcard'] || ''",
    "hs-pdf-form-top-peopleType": "detailData['people_type'] || ''",
    "hs-pdf-form-top-idcard": "detailData['idcard'] || ''",
    "hs-pdf-form-top-bbzl": "detailData['specimen_type']",
    "hs-pdf-form-top-cjTime": "detailData['sapmpling_time'] || ''",
    "hs-pdf-footer-per": "detailData['checkName'] || ''",
    "hs-pdf-form-top-RenYuanLeiXing": "detailData['people_type'] || ''",
    "hs-pdf-form-top-ChuanRanXingJiBingKe": "detailData['department_name'] || ''",
    "hs-pdf-form-top-SongJianKeShi": "detailData['department_name'] || ''", 
    "hs-pdf-form-top-SongJianYiSheng": "detailData['doctor_name'] || ''",
    "hs-pdf-form-top-BiaoBenHao": "detailData['sampleNo'] || ''",
    "hs-pdf-form-top-mobile": "detailData['mobile'] || ''",
    "hs-pdf-footer-ShenQingDate": "detailData['apply_time'] || ''",
    "hs-pdf-footer-CaiYangDate": "detailData['sapmpling_time'] || ''",
    "hs-pdf-footer-app": "detailData['shName'] || ''",
    "hs-pdf-form-top-BingLiHao": "detailData['sampleNo'] || ''",
    "hs-pdf-form-top-idCard": "detailData['idcard'] || ''",
    "hs-pdf-footer-BaoGaoDate": "detailData['report_time'] || ''",
    "hs-pdf-form-top-sjmd": "detailData['sjName'] || ''",
    "hs-pdf-form-top-BingRenLeiXing":"detailData['people_type'] || ''",
    "hs-pdf-form-top-ShenQingYiSheng":"detailData['doctor_name'] || ''",
    "hs-pdf-form-top-ybzl":"detailData['specimen_type'] || ''",
    "hs-pdf-table-content": `
    <div class="hs-pdf-table-content-cell" v-for="(item ,index) in detailData['itemList']" :key="index">
        <div>{{item['']  || ""}}</div>
        <div>{{item['']  || ""}}</div>
        <div>{{item['']  || ""}}</div>
        <div>{{item['']  || ""}}</div> 
    </div>
    `
}

function formatHsHTMLStyle(str, type) {
    return {
        templateStr: `<template>${str.match(/<body[^>]*>([\s\S]+?)<\/body>/i)[0].replace(/<body>|<\/body>/g, " ").replace(/<!--[^>]*>([\s\S]+?)-->/g , "")}</template>`,
        styleStr: str.match(/<style[^>]*>(.|\n)*<\/style>/gi)[0],
        scriptStr: type === 'vue3' ?
            `
            <script>
                import { defineComponent } from "vue";
                import MixinObject from './Mixin';
                export default defineComponent(MixinObject);
            </script>` : `
            <script>
            import { printImage,filterDataImage } from "@/plugin/downloadFunc.js";
            export default {
                props: ["detailData"],
                data(){
                    return{
                        patientDetail:{}
                    }
                },
                methods:{

                },
                created(){
                    this.patientDetail = filterDataImage(this.detailData); 
                },
                mounted(){
                    this.$nextTick(() => {
                        printImage(this.$emit("computed"));
                    });
                }
            }
            </script>
        `
    }
}

function changeReg(i) {
    return new RegExp(`<div class="${i}">([\\\s\\\S]*?)</div>`, 'g')
}

function changeOldStr(oldStr, index, length, regStr, newStr, i, vueType) {
    if (regStr.match(/<span>/)) {
        return oldStr.slice(0, index) + regStr.replace(/<span>/, `<span>${vueType === 'vue3' ? '{{'+newStr.replace(/detailData/ , "patientDetail['value']")+'}}' : '{{'+newStr+'}}'}`) + oldStr.slice(index + length, )
    } else if (regStr.match(/<img/) === null) {
        return oldStr.slice(0, index) + regStr.replace(new RegExp(`<div class="${i}">`), `<div class="${i}">${vueType === 'vue3' ? newStr.replace(/detailData/ , "patientDetail['value']") : newStr}`) + oldStr.slice(index + length, )
    } else {
        return oldStr
    }
}

function changeHTMLDynamic(htmlStr, type) {
    for (let i in dictionary) {
        if (htmlStr.match(changeReg(i))) {
            if (htmlStr.match(changeReg(i))[0]) {
                htmlStr = changeOldStr(htmlStr, htmlStr.indexOf(htmlStr.match(changeReg(i))), htmlStr.match(changeReg(i))[0].length, htmlStr.match(changeReg(i))[0], `${dictionary[i]}`, i, type)
            }
        }
    }
    return htmlStr;
}

function synthesisVue(obje, type) {
    Object.assign(obje, {
        templateStr: changeHTMLDynamic(obje['templateStr'], type)
    })
    return obje;
}

function changeTemplateToVue(templateSrc, type, fileType) {
    return function (cb) {
        if (fileType === "url") {
            JSDOM.fromURL(templateSrc).then(dom => {
                cb(synthesisVue(formatHsHTMLStyle(dom.serialize(), type)))
            })
        } else {
            JSDOM.fromFile(templateSrc).then(dom => {
                cb(synthesisVue(formatHsHTMLStyle(dom.serialize(), type), type))
            })
        }
    }
}

function saveVue(vueName, vueHTML) {
    return function (cb) {
        fs.writeFile("./Vue/" + vueName + ".vue", vueHTML, (err) => {
            if (err) {
                cb(undefined, err);
            } else {
                cb(vueName + ".vue保存成功");
            }
        })
    }
}

changeTemplateToVue("./index.html", "vue3")((val) => {
    saveVue("fnqrmyy", `
        ${val['templateStr']}
        ${val['scriptStr']}
        ${val['styleStr']}
    `)((e, msg) => {
        console.log(e, msg)
    })
})