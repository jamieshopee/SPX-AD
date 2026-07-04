/* 自動生成：供 file:// 離線模式讀取；資料來源仍是 templates 目錄內的 JSON。 */
(function (global) {
  global.AD_TEMPLATE_REGISTRY = {
  "templates/984x309/template.json": {
    "version": "1.0.0",
    "templateId": "984x309-template",
    "templateCode": "template",
    "templateName": "預設版型",
    "placementId": "繳費機手機號碼輸入畫面下BN_984x309",
    "size": "984x309",
    "width": 984,
    "height": 309,
    "editorTitle": "繳費機手機號碼輸入畫面下 BN｜預設版型",
    "implemented": true,
    "canvas": {
      "infoStyle": {
        "position": "absolute",
        "left": "0px",
        "bottom": "0px",
        "width": "984px",
        "zIndex": "47",
        "pointerEvents": "none"
      }
    },
    "guides": {
      "threeProducts": "assets/source/984x309/guide_品.png",
      "personProduct": "assets/source/984x309/guide_1人1品.png"
    },
    "sourceAssets": {
      "threeProductsGuide": "assets/source/984x309/guide_品.png",
      "personProductGuide": "assets/source/984x309/guide_1人1品.png"
    },
    "fonts": [
      {
        "family": "ShopeeNotoSans (content)",
        "weight": "300",
        "src": "assets/fonts/ShopeeNotoSans(content)-Regular.ttf"
      },
      {
        "family": "ShopeeNotoSans (content)",
        "weight": "400",
        "src": "assets/fonts/ShopeeNotoSans(content)-Medium.ttf"
      },
      {
        "family": "ShopeeNotoSans (content)",
        "weight": "700",
        "src": "assets/fonts/ShopeeNotoSans(content)-Bold.ttf"
      }
    ],
    "textFields": {
      "main": {
        "label": "主標",
        "className": "主標可08個字以內",
        "defaultText": "主標可08個字以內",
        "limit": 8,
        "style": {
          "position": "absolute",
          "left": "48px",
          "top": "109px",
          "width": "430px",
          "fontSize": "45px",
          "fontFamily": "ShopeeNotoSans (content)",
          "fontWeight": "400",
          "lineHeight": "1.2",
          "textAlign": "left",
          "zIndex": "15"
        }
      },
      "sub": {
        "label": "副標",
        "className": "副標07個字以內",
        "defaultText": "副標07個字以內",
        "limit": 7,
        "style": {
          "position": "absolute",
          "left": "48px",
          "top": "161px",
          "width": "430px",
          "fontSize": "58px",
          "fontFamily": "ShopeeNotoSans (content)",
          "fontWeight": "700",
          "lineHeight": "1.2",
          "textAlign": "left",
          "zIndex": "14"
        }
      },
      "small": {
        "label": "小字",
        "className": "不放案型日期或警語可在14個字",
        "defaultText": "不放案型日期或警語可在14個字",
        "limit": 14,
        "style": {
          "position": "absolute",
          "left": "48px",
          "top": "238px",
          "width": "430px",
          "fontSize": "20px",
          "fontFamily": "ShopeeNotoSans (content)",
          "fontWeight": "400",
          "lineHeight": "1.2",
          "textAlign": "left",
          "zIndex": "13"
        }
      }
    },
    "logo": {
      "max": 3,
      "className": "LOGO範圍",
      "trim": {
        "transparent": true,
        "solidBorder": true,
        "paddingRatio": 0.01
      },
      "style": {
        "position": "absolute",
        "left": "48px",
        "top": "38px",
        "width": "350px",
        "height": "65px",
        "zIndex": "18",
        "backgroundColor": "rgb(255, 255, 255)",
        "borderRadius": "5px",
        "opacity": "1",
        "display": "none"
      },
      "layout": {
        "canvasWidth": 984,
        "maxWidth": 350,
        "blockHeight": 65,
        "maxLogoHeight": 55,
        "horizontalPadding": 15,
        "verticalPadding": 5,
        "gap": 15,
        "shrinkToContent": true,
        "align": "left",
        "borderRadius": "5px",
        "itemBorderRadius": "5px",
        "squareSize": 65,
        "squarePadding": 5,
        "circlePadding": 8
      }
    },
    "productZones": {
      "threeProducts": {
        "className": "商品圖範圍",
        "style": {
          "position": "absolute",
          "left": "487px",
          "top": "24px",
          "width": "371px",
          "height": "235px",
          "zIndex": "25",
          "backgroundColor": "transparent",
          "opacity": "1",
          "overflow": "visible"
        },
        "defaultLayout": {
          "maxItems": 3,
          "layoutMode": "heightBodyCentered",
          "objectPosition": "center center",
          "sizeRatios": [
            1,
            0.85,
            0.72
          ],
          "overlap": 0,
          "overlapRatio": 0,
          "bottomAlign": true,
          "roles": [
            "主品",
            "左配品",
            "右配品"
          ],
          "padding": 0,
          "gap": 6,
          "maxHeightRatio": 1,
          "topPadding": 0,
          "bottomPadding": 0,
          "ctaGap": 6,
          "ctaHeightRatio": 0.96,
          "initialHeightRatio": 0.55,
          "initialMaxWidthRatio": 0.65,
          "dragBounds": {
            "minWidth": 20,
            "minHeight": 15,
            "maxWidthRatio": 0.95,
            "maxHeightRatio": 0.95
          },
          "autoShadow": true
        }
      },
      "person": {
        "className": "_1人",
        "style": {
          "position": "absolute",
          "left": "658px",
          "top": "24px",
          "width": "200px",
          "height": "285px",
          "zIndex": "24",
          "overflow": "hidden",
          "display": "none"
        },
        "defaultLayout": {
          "sizingMode": "contentWidth",
          "resetZoneOnUpload": true,
          "fitWidth": 200,
          "fitHeight": 285,
          "analysisMaxDimension": 984,
          "offsetX": 0,
          "offsetY": 0
        }
      },
      "singleProduct": {
        "className": "_1品",
        "style": {
          "position": "absolute",
          "left": "488px",
          "top": "24px",
          "width": "165px",
          "height": "235px",
          "zIndex": "22",
          "backgroundColor": "transparent",
          "overflow": "hidden",
          "display": "none"
        },
        "defaultLayout": {
          "sizingMode": "zone",
          "objectFit": "contain",
          "maxWidth": 165,
          "maxHeight": 235,
          "landscapeZoneHeight": 235,
          "offsetY": 0,
          "manualStep": 5,
          "dragBounds": {
            "minVisibleRatioX": 0.5,
            "minVisibleRatioY": 0.5
          },
          "autoShadow": true
        }
      }
    },
    "layerOrder": {
      "background": 1,
      "smallText": 13,
      "subText": 14,
      "mainText": 15,
      "logo": 18,
      "singleProduct": 22,
      "person": 24,
      "products": 25,
      "info": 47
    },
    "output": {
      "format": "png",
      "width": 984,
      "height": 309,
      "fileName": "繳費機手機號碼輸入畫面下BN_02.png",
      "projectFileName": "繳費機手機號碼輸入畫面下BN_02.project.json"
    },
    "schema": "spx-ad-template",
    "defaultStyleId": "01",
    "stylesBasePath": "templates/984x309/styles"
  },
  "templates/984x309/styles/01.json": {
    "schema": "spx-ad-style",
    "id": "01",
    "name": "樣式 01",
    "background": "assets/source/984x309/backgrounds/bg_01.png",
    "infoGraphic": "assets/source/984x309/info/info_01.png",
    "headlineColor": "#c5fe9b",
    "subHeadlineColor": "#fff4a1",
    "smallTextColor": "#c5fe9b"
  },
  "templates/984x309/styles/02.json": {
    "schema": "spx-ad-style",
    "id": "02",
    "name": "樣式 02",
    "background": "assets/source/984x309/backgrounds/bg_02.png",
    "infoGraphic": "assets/source/984x309/info/info_02.png",
    "headlineColor": "rgb(143, 210, 241)",
    "subHeadlineColor": "rgb(253, 245, 161)",
    "smallTextColor": "rgb(143, 210, 241)"
  },
  "templates/984x309/styles/03.json": {
    "schema": "spx-ad-style",
    "id": "03",
    "name": "樣式 03",
    "background": "assets/source/984x309/backgrounds/bg_03.png",
    "infoGraphic": "assets/source/984x309/info/info_03.png",
    "headlineColor": "#998b84",
    "subHeadlineColor": "#41a17c",
    "smallTextColor": "#998b84"
  },
  "templates/984x309/styles/04.json": {
    "schema": "spx-ad-style",
    "id": "04",
    "name": "樣式 04",
    "background": "assets/source/984x309/backgrounds/bg_04.png",
    "infoGraphic": "assets/source/984x309/info/info_04.png",
    "headlineColor": "#96de97",
    "subHeadlineColor": "#ffd2ac",
    "smallTextColor": "#96de97"
  },
  "templates/984x309/styles/05.json": {
    "schema": "spx-ad-style",
    "id": "05",
    "name": "樣式 05",
    "background": "assets/source/984x309/backgrounds/bg_05.png",
    "infoGraphic": "assets/source/984x309/info/info_05.png",
    "headlineColor": "#9a6621",
    "subHeadlineColor": "#4947b0",
    "smallTextColor": "#9a6621"
  },
  "templates/984x309/styles/06.json": {
    "schema": "spx-ad-style",
    "id": "06",
    "name": "樣式 06",
    "background": "assets/source/984x309/backgrounds/bg_06.png",
    "infoGraphic": "assets/source/984x309/info/info_06.png",
    "headlineColor": "#b98764",
    "subHeadlineColor": "#864343",
    "smallTextColor": "#b98764"
  },
  "templates/984x309/styles/07.json": {
    "schema": "spx-ad-style",
    "id": "07",
    "name": "樣式 07",
    "background": "assets/source/984x309/backgrounds/bg_07.png",
    "infoGraphic": "assets/source/984x309/info/info_07.png",
    "headlineColor": "#74bcee",
    "subHeadlineColor": "#ffdca0",
    "smallTextColor": "#74bcee"
  },
  "templates/984x309/styles/08.json": {
    "schema": "spx-ad-style",
    "id": "08",
    "name": "樣式 08",
    "background": "assets/source/984x309/backgrounds/bg_08.png",
    "infoGraphic": "assets/source/984x309/info/info_08.png",
    "headlineColor": "#519496",
    "subHeadlineColor": "#905436",
    "smallTextColor": "#519496"
  },
  "templates/984x309/styles/09.json": {
    "schema": "spx-ad-style",
    "id": "09",
    "name": "樣式 09",
    "background": "assets/source/984x309/backgrounds/bg_09.png",
    "infoGraphic": "assets/source/984x309/info/info_09.png",
    "headlineColor": "#7695b4",
    "subHeadlineColor": "#8e65b2",
    "smallTextColor": "#7695b4"
  },
  "templates/984x309/styles/10.json": {
    "schema": "spx-ad-style",
    "id": "10",
    "name": "樣式 10",
    "background": "assets/source/984x309/backgrounds/bg_10.png",
    "infoGraphic": "assets/source/984x309/info/info_10.png",
    "headlineColor": "#b5845a",
    "subHeadlineColor": "#2f47b2",
    "smallTextColor": "#b5845a"
  },
  "templates/984x309/styles/11.json": {
    "schema": "spx-ad-style",
    "id": "11",
    "name": "樣式 11",
    "background": "assets/source/984x309/backgrounds/bg_11.png",
    "infoGraphic": "assets/source/984x309/info/info_11.png",
    "headlineColor": "#d7c6ea",
    "subHeadlineColor": "#fede7b",
    "smallTextColor": "#d7c6ea"
  },
  "templates/984x309/styles/12.json": {
    "schema": "spx-ad-style",
    "id": "12",
    "name": "樣式 12",
    "background": "assets/source/984x309/backgrounds/bg_12.png",
    "infoGraphic": "assets/source/984x309/info/info_12.png",
    "headlineColor": "#d2c9b8",
    "subHeadlineColor": "#bda3d4",
    "smallTextColor": "#d2c9b8"
  },
  "templates/984x309/styles/13.json": {
    "schema": "spx-ad-style",
    "id": "13",
    "name": "樣式 13",
    "background": "assets/source/984x309/backgrounds/bg_13.png",
    "infoGraphic": "assets/source/984x309/info/info_13.png",
    "headlineColor": "#a3c7e3",
    "subHeadlineColor": "#fce2b0",
    "smallTextColor": "#a3c7e3"
  },
  "templates/984x309/styles/14.json": {
    "schema": "spx-ad-style",
    "id": "14",
    "name": "樣式 14",
    "background": "assets/source/984x309/backgrounds/bg_14.png",
    "infoGraphic": "assets/source/984x309/info/info_14.png",
    "headlineColor": "#d2584b",
    "subHeadlineColor": "#335e99",
    "smallTextColor": "#d2584b"
  },
  "templates/984x309/styles/15.json": {
    "schema": "spx-ad-style",
    "id": "15",
    "name": "樣式 15",
    "background": "assets/source/984x309/backgrounds/bg_15.png",
    "infoGraphic": "assets/source/984x309/info/info_15.png",
    "headlineColor": "#317ede",
    "subHeadlineColor": "#6f4dc7",
    "smallTextColor": "#317ede"
  },
  "templates/984x309/styles/16.json": {
    "schema": "spx-ad-style",
    "id": "16",
    "name": "樣式 16",
    "background": "assets/source/984x309/backgrounds/bg_16.png",
    "infoGraphic": "assets/source/984x309/info/info_16.png",
    "headlineColor": "#08667d",
    "subHeadlineColor": "#fffbdc",
    "smallTextColor": "#08667d"
  },
  "templates/1080x1920/template.json": {
    "version": "1.0.0",
    "templateId": "1080x1920-template",
    "templateCode": "template",
    "templateName": "預設版型",
    "placementId": "TVBN-智取店_1080x1920",
    "size": "1080x1920",
    "width": 1080,
    "height": 1920,
    "editorTitle": "TVBN 智取店｜預設版型",
    "canvas": {
      "infoStyle": {
        "position": "absolute",
        "left": "0px",
        "bottom": "0px",
        "width": "1080px",
        "zIndex": "47",
        "pointerEvents": "none"
      }
    },
    "guides": {
      "threeProducts": "assets/source/1080x1920/guide_品.png",
      "personProduct": "assets/source/1080x1920/guide_1人1品.png"
    },
    "fonts": [
      {
        "family": "ShopeeNotoSans (content)",
        "weight": "300",
        "src": "assets/fonts/ShopeeNotoSans(content)-Regular.ttf"
      },
      {
        "family": "ShopeeNotoSans (content)",
        "weight": "400",
        "src": "assets/fonts/ShopeeNotoSans(content)-Medium.ttf"
      },
      {
        "family": "ShopeeNotoSans (content)",
        "weight": "700",
        "src": "assets/fonts/ShopeeNotoSans(content)-Bold.ttf"
      }
    ],
    "textFields": {
      "main": {
        "label": "主標",
        "className": "主標可08個字以內",
        "defaultText": "主標可08個字以內",
        "limit": 8,
        "style": {
          "position": "absolute",
          "left": "0px",
          "top": "348.034px",
          "width": "1080px",
          "fontSize": "90px",
          "fontFamily": "ShopeeNotoSans (content)",
          "fontWeight": "400",
          "lineHeight": "1",
          "textAlign": "center",
          "zIndex": "15"
        }
      },
      "sub": {
        "label": "副標",
        "className": "副標07個字以內",
        "defaultText": "副標07個字以內",
        "limit": 7,
        "style": {
          "position": "absolute",
          "left": "0px",
          "top": "459.883px",
          "width": "1080px",
          "fontSize": "120px",
          "fontFamily": "ShopeeNotoSans (content)",
          "fontWeight": "700",
          "lineHeight": "1",
          "textAlign": "center",
          "zIndex": "14"
        }
      },
      "small": {
        "label": "小字",
        "className": "不放案型日期或警語可在14個字",
        "defaultText": "不放案型日期或警語可在14個字",
        "limit": 14,
        "style": {
          "position": "absolute",
          "left": "0px",
          "top": "605.285px",
          "width": "1080px",
          "fontSize": "58px",
          "fontFamily": "ShopeeNotoSans (content)",
          "fontWeight": "400",
          "lineHeight": "1",
          "textAlign": "center",
          "zIndex": "13"
        }
      }
    },
    "logo": {
      "max": 3,
      "className": "LOGO範圍",
      "trim": {
        "transparent": true,
        "solidBorder": true,
        "paddingRatio": 0.01
      },
      "style": {
        "position": "absolute",
        "left": "210px",
        "top": "182px",
        "width": "660px",
        "height": "150px",
        "zIndex": "18",
        "backgroundColor": "rgb(255, 255, 255)",
        "borderRadius": "15px",
        "opacity": "1",
        "display": "none"
      },
      "layout": {
        "canvasWidth": 1080,
        "maxWidth": 660,
        "blockHeight": 150,
        "maxLogoHeight": 130,
        "horizontalPadding": 30,
        "verticalPadding": 10,
        "gap": 30,
        "shrinkToContent": true,
        "borderRadius": "15px",
        "itemBorderRadius": "15px",
        "squareSize": 165,
        "squarePadding": 12,
        "circlePadding": 20
      }
    },
    "productZones": {
      "threeProducts": {
        "className": "商品範圍",
        "style": {
          "position": "absolute",
          "left": "50px",
          "top": "720px",
          "width": "980px",
          "height": "850px",
          "zIndex": "23",
          "backgroundColor": "transparent",
          "opacity": "1",
          "overflow": "hidden"
        },
        "defaultLayout": {
          "maxItems": 3,
          "sizeRatios": [
            1,
            0.85,
            0.72
          ],
          "overlap": 0,
          "bottomAlign": true,
          "roles": [
            "主品",
            "左配品",
            "右配品"
          ],
          "padding": 6,
          "gap": 8,
          "maxHeightRatio": 0.88,
          "topPadding": 4,
          "bottomPadding": 4,
          "ctaGap": 8,
          "ctaHeightRatio": 0.96,
          "initialHeightRatio": 0.55,
          "initialMaxWidthRatio": 0.65,
          "dragBounds": {
            "minWidth": 40,
            "minHeight": 30,
            "maxWidthRatio": 0.95,
            "maxHeightRatio": 0.95
          },
          "autoShadow": true
        }
      },
      "person": {
        "className": "_1人",
        "style": {
          "position": "absolute",
          "left": "540px",
          "top": "720px",
          "width": "535px",
          "height": "1200px",
          "zIndex": "22",
          "overflow": "hidden",
          "display": "none"
        },
        "defaultLayout": {
          "fitWidth": 535,
          "fitHeight": 1200,
          "analysisMaxDimension": 1200,
          "offsetX": 0,
          "offsetY": 0
        }
      },
      "singleProduct": {
        "className": "_1品",
        "style": {
          "position": "absolute",
          "left": "50px",
          "top": "816px",
          "width": "470px",
          "height": "700px",
          "zIndex": "21",
          "overflow": "hidden",
          "display": "none"
        },
        "defaultLayout": {
          "maxWidth": 470,
          "maxHeight": 700,
          "landscapeZoneHeight": 700,
          "offsetY": 0,
          "manualStep": 10,
          "dragBounds": {
            "minVisibleRatioX": 0.5,
            "minVisibleRatioY": 0.5
          },
          "autoShadow": true
        }
      }
    },
    "layerOrder": {
      "background": 1,
      "smallText": 13,
      "subText": 14,
      "mainText": 15,
      "logo": 18,
      "singleProduct": 21,
      "person": 22,
      "products": 23,
      "info": 47
    },
    "output": {
      "format": "png",
      "width": 1080,
      "height": 1920,
      "fileName": "TVBN-智取店_02.png",
      "projectFileName": "TVBN-智取店_02.project.json"
    },
    "sourceAssets": {
      "threeProductsGuide": "assets/source/1080x1920/guide_品.png",
      "personProductGuide": "assets/source/1080x1920/guide_1人1品.png"
    },
    "schema": "spx-ad-template",
    "implemented": true,
    "defaultStyleId": "01",
    "stylesBasePath": "templates/1080x1920/styles"
  },
  "templates/1080x1920/styles/01.json": {
    "schema": "spx-ad-style",
    "id": "01",
    "name": "樣式 01",
    "background": "assets/source/1080x1920/backgrounds/bg_01.png",
    "infoGraphic": "assets/source/1080x1920/info/info_01.png",
    "headlineColor": "#c5fe9b",
    "subHeadlineColor": "#fff4a1",
    "smallTextColor": "#c5fe9b"
  },
  "templates/1080x1920/styles/02.json": {
    "schema": "spx-ad-style",
    "id": "02",
    "name": "樣式 02",
    "background": "assets/source/1080x1920/backgrounds/bg_02.png",
    "infoGraphic": "assets/source/1080x1920/info/info_02.png",
    "headlineColor": "rgb(143, 210, 241)",
    "subHeadlineColor": "rgb(253, 245, 161)",
    "smallTextColor": "rgb(143, 210, 241)"
  },
  "templates/1080x1920/styles/03.json": {
    "schema": "spx-ad-style",
    "id": "03",
    "name": "樣式 03",
    "background": "assets/source/1080x1920/backgrounds/bg_03.png",
    "infoGraphic": "assets/source/1080x1920/info/info_03.png",
    "headlineColor": "#998b84",
    "subHeadlineColor": "#41a17c",
    "smallTextColor": "#998b84"
  },
  "templates/1080x1920/styles/04.json": {
    "schema": "spx-ad-style",
    "id": "04",
    "name": "樣式 04",
    "background": "assets/source/1080x1920/backgrounds/bg_04.png",
    "infoGraphic": "assets/source/1080x1920/info/info_04.png",
    "headlineColor": "#96de97",
    "subHeadlineColor": "#ffd2ac",
    "smallTextColor": "#96de97"
  },
  "templates/1080x1920/styles/05.json": {
    "schema": "spx-ad-style",
    "id": "05",
    "name": "樣式 05",
    "background": "assets/source/1080x1920/backgrounds/bg_05.png",
    "infoGraphic": "assets/source/1080x1920/info/info_05.png",
    "headlineColor": "#9a6621",
    "subHeadlineColor": "#4947b0",
    "smallTextColor": "#9a6621"
  },
  "templates/1080x1920/styles/06.json": {
    "schema": "spx-ad-style",
    "id": "06",
    "name": "樣式 06",
    "background": "assets/source/1080x1920/backgrounds/bg_06.png",
    "infoGraphic": "assets/source/1080x1920/info/info_06.png",
    "headlineColor": "#b98764",
    "subHeadlineColor": "#864343",
    "smallTextColor": "#b98764"
  },
  "templates/1080x1920/styles/07.json": {
    "schema": "spx-ad-style",
    "id": "07",
    "name": "樣式 07",
    "background": "assets/source/1080x1920/backgrounds/bg_07.png",
    "infoGraphic": "assets/source/1080x1920/info/info_07.png",
    "headlineColor": "#74bcee",
    "subHeadlineColor": "#ffdca0",
    "smallTextColor": "#74bcee"
  },
  "templates/1080x1920/styles/08.json": {
    "schema": "spx-ad-style",
    "id": "08",
    "name": "樣式 08",
    "background": "assets/source/1080x1920/backgrounds/bg_08.png",
    "infoGraphic": "assets/source/1080x1920/info/info_08.png",
    "headlineColor": "#519496",
    "subHeadlineColor": "#905436",
    "smallTextColor": "#519496"
  },
  "templates/1080x1920/styles/09.json": {
    "schema": "spx-ad-style",
    "id": "09",
    "name": "樣式 09",
    "background": "assets/source/1080x1920/backgrounds/bg_09.png",
    "infoGraphic": "assets/source/1080x1920/info/info_09.png",
    "headlineColor": "#7695b4",
    "subHeadlineColor": "#8e65b2",
    "smallTextColor": "#7695b4"
  },
  "templates/1080x1920/styles/10.json": {
    "schema": "spx-ad-style",
    "id": "10",
    "name": "樣式 10",
    "background": "assets/source/1080x1920/backgrounds/bg_10.png",
    "infoGraphic": "assets/source/1080x1920/info/info_10.png",
    "headlineColor": "#b5845a",
    "subHeadlineColor": "#2f47b2",
    "smallTextColor": "#b5845a"
  },
  "templates/1080x1920/styles/11.json": {
    "schema": "spx-ad-style",
    "id": "11",
    "name": "樣式 11",
    "background": "assets/source/1080x1920/backgrounds/bg_11.png",
    "infoGraphic": "assets/source/1080x1920/info/info_11.png",
    "headlineColor": "#d7c6ea",
    "subHeadlineColor": "#fede7b",
    "smallTextColor": "#d7c6ea"
  },
  "templates/1080x1920/styles/12.json": {
    "schema": "spx-ad-style",
    "id": "12",
    "name": "樣式 12",
    "background": "assets/source/1080x1920/backgrounds/bg_12.png",
    "infoGraphic": "assets/source/1080x1920/info/info_12.png",
    "headlineColor": "#d2c9b8",
    "subHeadlineColor": "#bda3d4",
    "smallTextColor": "#d2c9b8"
  },
  "templates/1080x1920/styles/13.json": {
    "schema": "spx-ad-style",
    "id": "13",
    "name": "樣式 13",
    "background": "assets/source/1080x1920/backgrounds/bg_13.png",
    "infoGraphic": "assets/source/1080x1920/info/info_13.png",
    "headlineColor": "#a3c7e3",
    "subHeadlineColor": "#fce2b0",
    "smallTextColor": "#a3c7e3"
  },
  "templates/1080x1920/styles/14.json": {
    "schema": "spx-ad-style",
    "id": "14",
    "name": "樣式 14",
    "background": "assets/source/1080x1920/backgrounds/bg_14.png",
    "infoGraphic": "assets/source/1080x1920/info/info_14.png",
    "headlineColor": "#d2584b",
    "subHeadlineColor": "#335e99",
    "smallTextColor": "#d2584b"
  },
  "templates/1080x1920/styles/15.json": {
    "schema": "spx-ad-style",
    "id": "15",
    "name": "樣式 15",
    "background": "assets/source/1080x1920/backgrounds/bg_15.png",
    "infoGraphic": "assets/source/1080x1920/info/info_15.png",
    "headlineColor": "#317ede",
    "subHeadlineColor": "#6f4dc7",
    "smallTextColor": "#317ede"
  },
  "templates/1080x1920/styles/16.json": {
    "schema": "spx-ad-style",
    "id": "16",
    "name": "樣式 16",
    "background": "assets/source/1080x1920/backgrounds/bg_16.png",
    "infoGraphic": "assets/source/1080x1920/info/info_16.png",
    "headlineColor": "#08667d",
    "subHeadlineColor": "#fffbdc",
    "smallTextColor": "#08667d"
  },
  "templates/1599x1080/template.json": {
    "version": "1.0.0",
    "templateId": "1599x1080-template",
    "templateCode": "template",
    "templateName": "預設版型",
    "placementId": "TVBN-一般門市_1599x1080",
    "size": "1599x1080",
    "width": 1599,
    "height": 1080,
    "editorTitle": "TVBN 一般門市｜預設版型",
    "implemented": true,
    "canvas": {
      "infoStyle": {
        "position": "absolute",
        "left": "0px",
        "bottom": "0px",
        "width": "1599px",
        "zIndex": "47",
        "pointerEvents": "none"
      }
    },
    "guides": {
      "threeProducts": "assets/source/1599x1080/guide_品.png",
      "personProduct": "assets/source/1599x1080/guide_1人1品.png"
    },
    "sourceAssets": {
      "threeProductsGuide": "assets/source/1599x1080/guide_品.png",
      "personProductGuide": "assets/source/1599x1080/guide_1人1品.png"
    },
    "fonts": [
      {
        "family": "ShopeeNotoSans (content)",
        "weight": "300",
        "src": "assets/fonts/ShopeeNotoSans(content)-Regular.ttf"
      },
      {
        "family": "ShopeeNotoSans (content)",
        "weight": "400",
        "src": "assets/fonts/ShopeeNotoSans(content)-Medium.ttf"
      },
      {
        "family": "ShopeeNotoSans (content)",
        "weight": "700",
        "src": "assets/fonts/ShopeeNotoSans(content)-Bold.ttf"
      }
    ],
    "textFields": {
      "main": {
        "label": "主標",
        "className": "主標可08個字以內",
        "defaultText": "主標可08個字以內",
        "limit": 8,
        "style": {
          "position": "absolute",
          "left": "63px",
          "top": "387px",
          "width": "700px",
          "fontSize": "83px",
          "fontFamily": "ShopeeNotoSans (content)",
          "fontWeight": "400",
          "lineHeight": "1.2",
          "textAlign": "left",
          "zIndex": "15"
        }
      },
      "sub": {
        "label": "副標",
        "className": "副標07個字以內",
        "defaultText": "副標07個字以內",
        "limit": 7,
        "style": {
          "position": "absolute",
          "left": "63px",
          "top": "490px",
          "width": "700px",
          "fontSize": "94px",
          "fontFamily": "ShopeeNotoSans (content)",
          "fontWeight": "700",
          "lineHeight": "1.2",
          "textAlign": "left",
          "zIndex": "14"
        }
      },
      "small": {
        "label": "小字",
        "className": "不放案型日期或警語可在14個字",
        "defaultText": "不放案型日期或警語可在14個字",
        "limit": 14,
        "style": {
          "position": "absolute",
          "left": "63px",
          "top": "609px",
          "width": "700px",
          "fontSize": "40px",
          "fontFamily": "ShopeeNotoSans (content)",
          "fontWeight": "400",
          "lineHeight": "1.2",
          "textAlign": "left",
          "zIndex": "13"
        }
      }
    },
    "logo": {
      "max": 3,
      "className": "LOGO範圍",
      "trim": {
        "transparent": true,
        "solidBorder": true,
        "paddingRatio": 0.01
      },
      "style": {
        "position": "absolute",
        "left": "63px",
        "top": "211px",
        "width": "630px",
        "height": "150px",
        "zIndex": "18",
        "backgroundColor": "rgb(255, 255, 255)",
        "borderRadius": "15px",
        "opacity": "1",
        "display": "none"
      },
      "layout": {
        "canvasWidth": 1599,
        "maxWidth": 630,
        "blockHeight": 150,
        "maxLogoHeight": 130,
        "horizontalPadding": 30,
        "verticalPadding": 10,
        "gap": 30,
        "shrinkToContent": true,
        "align": "left",
        "borderRadius": "15px",
        "itemBorderRadius": "15px",
        "squareSize": 150,
        "squarePadding": 10,
        "circlePadding": 15
      }
    },
    "productZones": {
      "threeProducts": {
        "className": "商品圖範圍",
        "style": {
          "position": "absolute",
          "left": "771px",
          "top": "100px",
          "width": "780px",
          "height": "650px",
          "zIndex": "24",
          "backgroundColor": "transparent",
          "opacity": "1",
          "overflow": "visible"
        },
        "defaultLayout": {
          "maxItems": 3,
          "layoutMode": "heightBodyCentered",
          "objectPosition": "center center",
          "sizeRatios": [
            1,
            0.85,
            0.72
          ],
          "overlap": 0,
          "overlapRatio": 0,
          "bottomAlign": true,
          "roles": [
            "主品",
            "左配品",
            "右配品"
          ],
          "padding": 0,
          "gap": 10,
          "maxHeightRatio": 1,
          "topPadding": 0,
          "bottomPadding": 0,
          "ctaGap": 10,
          "ctaHeightRatio": 0.96,
          "initialHeightRatio": 0.55,
          "initialMaxWidthRatio": 0.65,
          "dragBounds": {
            "minWidth": 40,
            "minHeight": 30,
            "maxWidthRatio": 0.95,
            "maxHeightRatio": 0.95
          },
          "autoShadow": true
        }
      },
      "person": {
        "className": "_1人",
        "style": {
          "position": "absolute",
          "left": "1141px",
          "top": "100px",
          "width": "430px",
          "height": "980px",
          "zIndex": "23",
          "overflow": "hidden",
          "display": "none"
        },
        "defaultLayout": {
          "sizingMode": "contentWidth",
          "resetZoneOnUpload": true,
          "fitWidth": 430,
          "fitHeight": 980,
          "analysisMaxDimension": 1599,
          "offsetX": 0,
          "offsetY": 0
        }
      },
      "singleProduct": {
        "className": "_1品",
        "style": {
          "position": "absolute",
          "left": "771px",
          "top": "210px",
          "width": "355px",
          "height": "540px",
          "zIndex": "22",
          "backgroundColor": "transparent",
          "overflow": "hidden",
          "display": "none"
        },
        "defaultLayout": {
          "sizingMode": "zone",
          "objectFit": "contain",
          "maxWidth": 355,
          "maxHeight": 540,
          "landscapeZoneHeight": 540,
          "offsetY": 0,
          "manualStep": 10,
          "dragBounds": {
            "minVisibleRatioX": 0.5,
            "minVisibleRatioY": 0.5
          },
          "autoShadow": true
        }
      }
    },
    "layerOrder": {
      "background": 1,
      "smallText": 13,
      "subText": 14,
      "mainText": 15,
      "logo": 18,
      "singleProduct": 22,
      "person": 23,
      "products": 24,
      "info": 47
    },
    "output": {
      "format": "png",
      "width": 1599,
      "height": 1080,
      "fileName": "TVBN一般門市_02.png",
      "projectFileName": "TVBN一般門市_02.project.json"
    },
    "schema": "spx-ad-template",
    "defaultStyleId": "01",
    "stylesBasePath": "templates/1599x1080/styles"
  },
  "templates/1599x1080/styles/01.json": {
    "schema": "spx-ad-style",
    "id": "01",
    "name": "樣式 01",
    "background": "assets/source/1599x1080/backgrounds/bg_01.png",
    "infoGraphic": "assets/source/1599x1080/info/info_01.png",
    "headlineColor": "#c5fe9b",
    "subHeadlineColor": "#fff4a1",
    "smallTextColor": "#c5fe9b"
  },
  "templates/1599x1080/styles/02.json": {
    "schema": "spx-ad-style",
    "id": "02",
    "name": "樣式 02",
    "background": "assets/source/1599x1080/backgrounds/bg_02.png",
    "infoGraphic": "assets/source/1599x1080/info/info_02.png",
    "headlineColor": "rgb(143, 210, 241)",
    "subHeadlineColor": "rgb(253, 245, 161)",
    "smallTextColor": "rgb(143, 210, 241)"
  },
  "templates/1599x1080/styles/03.json": {
    "schema": "spx-ad-style",
    "id": "03",
    "name": "樣式 03",
    "background": "assets/source/1599x1080/backgrounds/bg_03.png",
    "infoGraphic": "assets/source/1599x1080/info/info_03.png",
    "headlineColor": "#998b84",
    "subHeadlineColor": "#41a17c",
    "smallTextColor": "#998b84"
  },
  "templates/1599x1080/styles/04.json": {
    "schema": "spx-ad-style",
    "id": "04",
    "name": "樣式 04",
    "background": "assets/source/1599x1080/backgrounds/bg_04.png",
    "infoGraphic": "assets/source/1599x1080/info/info_04.png",
    "headlineColor": "#96de97",
    "subHeadlineColor": "#ffd2ac",
    "smallTextColor": "#96de97"
  },
  "templates/1599x1080/styles/05.json": {
    "schema": "spx-ad-style",
    "id": "05",
    "name": "樣式 05",
    "background": "assets/source/1599x1080/backgrounds/bg_05.png",
    "infoGraphic": "assets/source/1599x1080/info/info_05.png",
    "headlineColor": "#9a6621",
    "subHeadlineColor": "#4947b0",
    "smallTextColor": "#9a6621"
  },
  "templates/1599x1080/styles/06.json": {
    "schema": "spx-ad-style",
    "id": "06",
    "name": "樣式 06",
    "background": "assets/source/1599x1080/backgrounds/bg_06.png",
    "infoGraphic": "assets/source/1599x1080/info/info_06.png",
    "headlineColor": "#b98764",
    "subHeadlineColor": "#864343",
    "smallTextColor": "#b98764"
  },
  "templates/1599x1080/styles/07.json": {
    "schema": "spx-ad-style",
    "id": "07",
    "name": "樣式 07",
    "background": "assets/source/1599x1080/backgrounds/bg_07.png",
    "infoGraphic": "assets/source/1599x1080/info/info_07.png",
    "headlineColor": "#74bcee",
    "subHeadlineColor": "#ffdca0",
    "smallTextColor": "#74bcee"
  },
  "templates/1599x1080/styles/08.json": {
    "schema": "spx-ad-style",
    "id": "08",
    "name": "樣式 08",
    "background": "assets/source/1599x1080/backgrounds/bg_08.png",
    "infoGraphic": "assets/source/1599x1080/info/info_08.png",
    "headlineColor": "#519496",
    "subHeadlineColor": "#905436",
    "smallTextColor": "#519496"
  },
  "templates/1599x1080/styles/09.json": {
    "schema": "spx-ad-style",
    "id": "09",
    "name": "樣式 09",
    "background": "assets/source/1599x1080/backgrounds/bg_09.png",
    "infoGraphic": "assets/source/1599x1080/info/info_09.png",
    "headlineColor": "#7695b4",
    "subHeadlineColor": "#8e65b2",
    "smallTextColor": "#7695b4"
  },
  "templates/1599x1080/styles/10.json": {
    "schema": "spx-ad-style",
    "id": "10",
    "name": "樣式 10",
    "background": "assets/source/1599x1080/backgrounds/bg_10.png",
    "infoGraphic": "assets/source/1599x1080/info/info_10.png",
    "headlineColor": "#b5845a",
    "subHeadlineColor": "#2f47b2",
    "smallTextColor": "#b5845a"
  },
  "templates/1599x1080/styles/11.json": {
    "schema": "spx-ad-style",
    "id": "11",
    "name": "樣式 11",
    "background": "assets/source/1599x1080/backgrounds/bg_11.png",
    "infoGraphic": "assets/source/1599x1080/info/info_11.png",
    "headlineColor": "#d7c6ea",
    "subHeadlineColor": "#fede7b",
    "smallTextColor": "#d7c6ea"
  },
  "templates/1599x1080/styles/12.json": {
    "schema": "spx-ad-style",
    "id": "12",
    "name": "樣式 12",
    "background": "assets/source/1599x1080/backgrounds/bg_12.png",
    "infoGraphic": "assets/source/1599x1080/info/info_12.png",
    "headlineColor": "#d2c9b8",
    "subHeadlineColor": "#bda3d4",
    "smallTextColor": "#d2c9b8"
  },
  "templates/1599x1080/styles/13.json": {
    "schema": "spx-ad-style",
    "id": "13",
    "name": "樣式 13",
    "background": "assets/source/1599x1080/backgrounds/bg_13.png",
    "infoGraphic": "assets/source/1599x1080/info/info_13.png",
    "headlineColor": "#a3c7e3",
    "subHeadlineColor": "#fce2b0",
    "smallTextColor": "#a3c7e3"
  },
  "templates/1599x1080/styles/14.json": {
    "schema": "spx-ad-style",
    "id": "14",
    "name": "樣式 14",
    "background": "assets/source/1599x1080/backgrounds/bg_14.png",
    "infoGraphic": "assets/source/1599x1080/info/info_14.png",
    "headlineColor": "#d2584b",
    "subHeadlineColor": "#335e99",
    "smallTextColor": "#d2584b"
  },
  "templates/1599x1080/styles/15.json": {
    "schema": "spx-ad-style",
    "id": "15",
    "name": "樣式 15",
    "background": "assets/source/1599x1080/backgrounds/bg_15.png",
    "infoGraphic": "assets/source/1599x1080/info/info_15.png",
    "headlineColor": "#317ede",
    "subHeadlineColor": "#6f4dc7",
    "smallTextColor": "#317ede"
  },
  "templates/1599x1080/styles/16.json": {
    "schema": "spx-ad-style",
    "id": "16",
    "name": "樣式 16",
    "background": "assets/source/1599x1080/backgrounds/bg_16.png",
    "infoGraphic": "assets/source/1599x1080/info/info_16.png",
    "headlineColor": "#08667d",
    "subHeadlineColor": "#fffbdc",
    "smallTextColor": "#08667d"
  },
  "templates/3189x3992/template.json": {
    "version": "1.0.0",
    "templateId": "3189x3992-template",
    "templateCode": "template",
    "templateName": "預設版型",
    "placementId": "智取店繳費機BN_3189x3992",
    "size": "3189x3992",
    "width": 3189,
    "height": 3992,
    "editorTitle": "智取店繳費機 BN｜預設版型",
    "implemented": true,
    "canvas": {
      "infoStyle": {
        "position": "absolute",
        "left": "0px",
        "bottom": "0px",
        "width": "3189px",
        "zIndex": "47",
        "pointerEvents": "none"
      }
    },
    "guides": {
      "threeProducts": "assets/source/3189x3992/guide_品.png",
      "personProduct": "assets/source/3189x3992/guide_1人1品.png"
    },
    "sourceAssets": {
      "threeProductsGuide": "assets/source/3189x3992/guide_品.png",
      "personProductGuide": "assets/source/3189x3992/guide_1人1品.png"
    },
    "fonts": [
      {
        "family": "ShopeeNotoSans (content)",
        "weight": "300",
        "src": "assets/fonts/ShopeeNotoSans(content)-Regular.ttf"
      },
      {
        "family": "ShopeeNotoSans (content)",
        "weight": "400",
        "src": "assets/fonts/ShopeeNotoSans(content)-Medium.ttf"
      },
      {
        "family": "ShopeeNotoSans (content)",
        "weight": "700",
        "src": "assets/fonts/ShopeeNotoSans(content)-Bold.ttf"
      }
    ],
    "textFields": {
      "main": {
        "label": "主標",
        "className": "主標可08個字以內",
        "defaultText": "主標可08個字以內",
        "limit": 8,
        "style": {
          "position": "absolute",
          "left": "0px",
          "top": "707px",
          "width": "3189px",
          "fontSize": "238px",
          "fontFamily": "ShopeeNotoSans (content)",
          "fontWeight": "400",
          "lineHeight": "1.2",
          "textAlign": "center",
          "zIndex": "15"
        }
      },
      "sub": {
        "label": "副標",
        "className": "副標07個字以內",
        "defaultText": "副標07個字以內",
        "limit": 7,
        "style": {
          "position": "absolute",
          "left": "0px",
          "top": "997px",
          "width": "3189px",
          "fontSize": "325px",
          "fontFamily": "ShopeeNotoSans (content)",
          "fontWeight": "700",
          "lineHeight": "1.2",
          "textAlign": "center",
          "zIndex": "14"
        }
      },
      "small": {
        "label": "小字",
        "className": "不放案型日期或警語可在14個字",
        "defaultText": "不放案型日期或警語可在14個字",
        "limit": 14,
        "style": {
          "position": "absolute",
          "left": "0px",
          "top": "1418px",
          "width": "3189px",
          "fontSize": "148px",
          "fontFamily": "ShopeeNotoSans (content)",
          "fontWeight": "400",
          "lineHeight": "1.2",
          "textAlign": "center",
          "zIndex": "13"
        }
      }
    },
    "logo": {
      "max": 3,
      "className": "LOGO範圍",
      "trim": {
        "transparent": true,
        "solidBorder": true,
        "paddingRatio": 0.01
      },
      "style": {
        "position": "absolute",
        "left": "695px",
        "top": "271px",
        "width": "1800px",
        "height": "400px",
        "zIndex": "18",
        "backgroundColor": "rgb(255, 255, 255)",
        "borderRadius": "30px",
        "opacity": "1",
        "display": "none"
      },
      "layout": {
        "canvasWidth": 3189,
        "maxWidth": 1800,
        "blockHeight": 400,
        "maxLogoHeight": 340,
        "horizontalPadding": 100,
        "verticalPadding": 30,
        "gap": 60,
        "shrinkToContent": true,
        "borderRadius": "30px",
        "itemBorderRadius": "30px",
        "squareSize": 400,
        "squarePadding": 29,
        "circlePadding": 48
      }
    },
    "productZones": {
      "threeProducts": {
        "className": "商品圖範圍",
        "style": {
          "position": "absolute",
          "left": "144px",
          "top": "1669px",
          "width": "2901px",
          "height": "1300px",
          "zIndex": "24",
          "backgroundColor": "transparent",
          "opacity": "1",
          "overflow": "visible"
        },
        "defaultLayout": {
          "maxItems": 3,
          "layoutMode": "heightBottom",
          "objectPosition": "center bottom",
          "sizeRatios": [
            1,
            0.85,
            0.72
          ],
          "overlap": 0,
          "overlapRatio": 0,
          "bottomAlign": true,
          "roles": [
            "主品",
            "左配品",
            "右配品"
          ],
          "padding": 0,
          "gap": 24,
          "maxHeightRatio": 1,
          "topPadding": 0,
          "bottomPadding": 0,
          "ctaGap": 24,
          "ctaHeightRatio": 0.96,
          "initialHeightRatio": 0.55,
          "initialMaxWidthRatio": 0.65,
          "dragBounds": {
            "minWidth": 118,
            "minHeight": 89,
            "maxWidthRatio": 0.95,
            "maxHeightRatio": 0.95
          },
          "autoShadow": true
        }
      },
      "person": {
        "className": "_1人",
        "style": {
          "position": "absolute",
          "left": "1532px",
          "top": "1669px",
          "width": "1513px",
          "height": "2323px",
          "zIndex": "23",
          "overflow": "hidden",
          "display": "none"
        },
        "defaultLayout": {
          "sizingMode": "contentWidth",
          "resetZoneOnUpload": true,
          "fitWidth": 1513,
          "fitHeight": 2323,
          "analysisMaxDimension": 3189,
          "offsetX": 0,
          "offsetY": 0
        }
      },
      "singleProduct": {
        "className": "_1品",
        "style": {
          "position": "absolute",
          "left": "145px",
          "top": "1669px",
          "width": "1300px",
          "height": "1300px",
          "zIndex": "22",
          "backgroundColor": "transparent",
          "overflow": "hidden",
          "display": "none"
        },
        "defaultLayout": {
          "sizingMode": "zone",
          "objectFit": "contain",
          "maxWidth": 1300,
          "maxHeight": 1300,
          "landscapeZoneHeight": 1300,
          "offsetY": 0,
          "manualStep": 10,
          "dragBounds": {
            "minVisibleRatioX": 0.5,
            "minVisibleRatioY": 0.5
          },
          "autoShadow": true
        }
      }
    },
    "layerOrder": {
      "background": 1,
      "smallText": 13,
      "subText": 14,
      "mainText": 15,
      "logo": 18,
      "singleProduct": 22,
      "person": 23,
      "products": 24,
      "info": 47
    },
    "output": {
      "format": "png",
      "width": 3189,
      "height": 3992,
      "fileName": "智取店繳費機BN_02.png",
      "projectFileName": "智取店繳費機BN_02.project.json"
    },
    "schema": "spx-ad-template",
    "defaultStyleId": "01",
    "stylesBasePath": "templates/3189x3992/styles"
  },
  "templates/3189x3992/styles/01.json": {
    "schema": "spx-ad-style",
    "id": "01",
    "name": "樣式 01",
    "background": "assets/source/3189x3992/backgrounds/bg_01.png",
    "infoGraphic": "assets/source/3189x3992/info/info_01.png",
    "headlineColor": "#c5fe9b",
    "subHeadlineColor": "#fff4a1",
    "smallTextColor": "#c5fe9b"
  },
  "templates/3189x3992/styles/02.json": {
    "schema": "spx-ad-style",
    "id": "02",
    "name": "樣式 02",
    "background": "assets/source/3189x3992/backgrounds/bg_02.png",
    "infoGraphic": "assets/source/3189x3992/info/info_02.png",
    "headlineColor": "rgb(143, 210, 241)",
    "subHeadlineColor": "rgb(253, 245, 161)",
    "smallTextColor": "rgb(143, 210, 241)"
  },
  "templates/3189x3992/styles/03.json": {
    "schema": "spx-ad-style",
    "id": "03",
    "name": "樣式 03",
    "background": "assets/source/3189x3992/backgrounds/bg_03.png",
    "infoGraphic": "assets/source/3189x3992/info/info_03.png",
    "headlineColor": "#998b84",
    "subHeadlineColor": "#41a17c",
    "smallTextColor": "#998b84"
  },
  "templates/3189x3992/styles/04.json": {
    "schema": "spx-ad-style",
    "id": "04",
    "name": "樣式 04",
    "background": "assets/source/3189x3992/backgrounds/bg_04.png",
    "infoGraphic": "assets/source/3189x3992/info/info_04.png",
    "headlineColor": "#96de97",
    "subHeadlineColor": "#ffd2ac",
    "smallTextColor": "#96de97"
  },
  "templates/3189x3992/styles/05.json": {
    "schema": "spx-ad-style",
    "id": "05",
    "name": "樣式 05",
    "background": "assets/source/3189x3992/backgrounds/bg_05.png",
    "infoGraphic": "assets/source/3189x3992/info/info_05.png",
    "headlineColor": "#9a6621",
    "subHeadlineColor": "#4947b0",
    "smallTextColor": "#9a6621"
  },
  "templates/3189x3992/styles/06.json": {
    "schema": "spx-ad-style",
    "id": "06",
    "name": "樣式 06",
    "background": "assets/source/3189x3992/backgrounds/bg_06.png",
    "infoGraphic": "assets/source/3189x3992/info/info_06.png",
    "headlineColor": "#b98764",
    "subHeadlineColor": "#864343",
    "smallTextColor": "#b98764"
  },
  "templates/3189x3992/styles/07.json": {
    "schema": "spx-ad-style",
    "id": "07",
    "name": "樣式 07",
    "background": "assets/source/3189x3992/backgrounds/bg_07.png",
    "infoGraphic": "assets/source/3189x3992/info/info_07.png",
    "headlineColor": "#74bcee",
    "subHeadlineColor": "#ffdca0",
    "smallTextColor": "#74bcee"
  },
  "templates/3189x3992/styles/08.json": {
    "schema": "spx-ad-style",
    "id": "08",
    "name": "樣式 08",
    "background": "assets/source/3189x3992/backgrounds/bg_08.png",
    "infoGraphic": "assets/source/3189x3992/info/info_08.png",
    "headlineColor": "#519496",
    "subHeadlineColor": "#905436",
    "smallTextColor": "#519496"
  },
  "templates/3189x3992/styles/09.json": {
    "schema": "spx-ad-style",
    "id": "09",
    "name": "樣式 09",
    "background": "assets/source/3189x3992/backgrounds/bg_09.png",
    "infoGraphic": "assets/source/3189x3992/info/info_09.png",
    "headlineColor": "#7695b4",
    "subHeadlineColor": "#8e65b2",
    "smallTextColor": "#7695b4"
  },
  "templates/3189x3992/styles/10.json": {
    "schema": "spx-ad-style",
    "id": "10",
    "name": "樣式 10",
    "background": "assets/source/3189x3992/backgrounds/bg_10.png",
    "infoGraphic": "assets/source/3189x3992/info/info_10.png",
    "headlineColor": "#b5845a",
    "subHeadlineColor": "#2f47b2",
    "smallTextColor": "#b5845a"
  },
  "templates/3189x3992/styles/11.json": {
    "schema": "spx-ad-style",
    "id": "11",
    "name": "樣式 11",
    "background": "assets/source/3189x3992/backgrounds/bg_11.png",
    "infoGraphic": "assets/source/3189x3992/info/info_11.png",
    "headlineColor": "#d7c6ea",
    "subHeadlineColor": "#fede7b",
    "smallTextColor": "#d7c6ea"
  },
  "templates/3189x3992/styles/12.json": {
    "schema": "spx-ad-style",
    "id": "12",
    "name": "樣式 12",
    "background": "assets/source/3189x3992/backgrounds/bg_12.png",
    "infoGraphic": "assets/source/3189x3992/info/info_12.png",
    "headlineColor": "#d2c9b8",
    "subHeadlineColor": "#bda3d4",
    "smallTextColor": "#d2c9b8"
  },
  "templates/3189x3992/styles/13.json": {
    "schema": "spx-ad-style",
    "id": "13",
    "name": "樣式 13",
    "background": "assets/source/3189x3992/backgrounds/bg_13.png",
    "infoGraphic": "assets/source/3189x3992/info/info_13.png",
    "headlineColor": "#a3c7e3",
    "subHeadlineColor": "#fce2b0",
    "smallTextColor": "#a3c7e3"
  },
  "templates/3189x3992/styles/14.json": {
    "schema": "spx-ad-style",
    "id": "14",
    "name": "樣式 14",
    "background": "assets/source/3189x3992/backgrounds/bg_14.png",
    "infoGraphic": "assets/source/3189x3992/info/info_14.png",
    "headlineColor": "#d2584b",
    "subHeadlineColor": "#335e99",
    "smallTextColor": "#d2584b"
  },
  "templates/3189x3992/styles/15.json": {
    "schema": "spx-ad-style",
    "id": "15",
    "name": "樣式 15",
    "background": "assets/source/3189x3992/backgrounds/bg_15.png",
    "infoGraphic": "assets/source/3189x3992/info/info_15.png",
    "headlineColor": "#317ede",
    "subHeadlineColor": "#6f4dc7",
    "smallTextColor": "#317ede"
  },
  "templates/3189x3992/styles/16.json": {
    "schema": "spx-ad-style",
    "id": "16",
    "name": "樣式 16",
    "background": "assets/source/3189x3992/backgrounds/bg_16.png",
    "infoGraphic": "assets/source/3189x3992/info/info_16.png",
    "headlineColor": "#08667d",
    "subHeadlineColor": "#fffbdc",
    "smallTextColor": "#08667d"
  }
};
})(window);
