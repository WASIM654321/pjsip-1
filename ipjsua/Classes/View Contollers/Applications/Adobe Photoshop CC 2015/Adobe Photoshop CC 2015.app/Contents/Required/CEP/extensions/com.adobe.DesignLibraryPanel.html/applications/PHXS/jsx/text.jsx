/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50, sloppy: true, continue: true */
/*global $, Folder, app, DocumentFill, ActionDescriptor, ActionReference, DialogModes, File, sTID, cTID,
         TypeUnits, ActionList, SolidColor, executeAction, executeActionGet, PhotoshopSaveOptions, SaveOptions, PNGSaveOptions,
         LayerKind, cssToClip, svg, duplicateLayer, ColorModel, JSXGlobals, PSKey, PSClass, PSString, PSType, PSEnum, UnderlineType, StrikeThruType, UnitValue, COLOR, UTIL,
         WarpStyle, Direction, TextComposer, Language, TextType, Justification, TextCase, AutoKernType, AntiAlias, ElementPlacement, PSUnit, PSEvent, duplicateLayerInsideDocument,
         hasLayerStyles, tTSID, getSelectedLayerIndices    */

var TEXT = {};

/* Takes a TextItem and returns the properties as an object*/
TEXT.getTextItemObject = function () {
    app.refreshFonts();
    var obj = {};

    var ref = new ActionReference();
    ref.putEnumerated(PSClass.Layer, PSType.Ordinal, PSEnum.Target);
    var desc = executeActionGet(ref);
    var list = desc.getObjectValue(PSKey.Text);
    var tsr = list.getList(PSClass.TextStyleRange);
    var tsr0 = tsr.getObjectValue(0);
    var textStyle = tsr0.getObjectValue(PSClass.TextStyle);


    // The postscript name for a font is available for all text items even with fonts which are unavailabe. It is only unreported when the
    // font is set to the default font e.g. MyriadPro-Regular.
    var fontPS = textStyle.hasKey(PSString.fontPostScriptName) ? textStyle.getString(PSString.fontPostScriptName) : 'MyriadPro-Regular',
        fontObj;
    try {
        fontObj = app.fonts.getByName(fontPS);  // If the font is unavailabe this call throws an exception
    } catch (e) {
        return false; // Return false to indicate there is no font information IE unavailable font
    }

    obj.adbeFont = {
        family: fontObj.family,
        name: fontObj.name,
        postScriptName: fontObj.postScriptName,
        style: fontObj.style
    };

    obj.fontFamily = fontObj.family;

    var style = fontObj.style.toLowerCase();
    if (style.indexOf('italic') !== -1) {
        obj.fontStyle = 'italic';
    } else if (style.indexOf('oblique') !== -1) {
        obj.fontStyle = 'oblique';
    }

    if (style.indexOf('bold') !== -1) {
        obj.fontWeight = 'bold';
    }

    if (style.indexOf('light') !== -1 || style.indexOf('thin') !== -1) {
        obj.fontWeight = 'lighter';
    }

    var uv;
    if (textStyle.hasKey(PSKey.ImpliedFontSize)) {
        var sizeValue = textStyle.getUnitDoubleValue(PSKey.ImpliedFontSize),
            sizeUnitType = textStyle.getUnitDoubleType(PSKey.ImpliedFontSize);
        uv = new UnitValue(sizeValue.toString() + " " + tTSID(sizeUnitType).replace("Unit", ""));
        obj.fontSize = {
            type: uv.type,
            value: uv.value
        };
    } else {
        uv = new UnitValue("12", "pt");
        obj.fontSize = {
            type: uv.type,
            value: uv.value
        };
    }

    if (textStyle.hasKey(PSString.AutoLeading) && textStyle.getBoolean(PSString.AutoLeading)) {
        obj.adbeAutoLeading = true;
    }

    if (textStyle.hasKey(PSKey.ImpliedLeading)) {
        var leadingValue = textStyle.getUnitDoubleValue(PSKey.ImpliedLeading),
            leadingUnitType = textStyle.getUnitDoubleType(PSKey.ImpliedLeading),
            leadingUV = new UnitValue(leadingValue.toString() + " " + tTSID(leadingUnitType).replace("Unit", ""));
        obj.lineHeight = {
            type: leadingUV.type,
            value: leadingUV.value
        };
    }

    if (textStyle.hasKey(PSKey.ImpliedBaselineShift)) {
        var baselineValue = textStyle.getUnitDoubleValue(PSKey.ImpliedBaselineShift),
            baselineUnitType = textStyle.getUnitDoubleType(PSKey.ImpliedBaselineShift),
            bUv = new UnitValue(baselineValue.toString() + " " + tTSID(baselineUnitType).replace("Unit", ""));
        obj.baselineShift = {
            type: bUv.type,
            value: bUv.value
        };
    }

    if (textStyle.hasKey(PSClass.Color)) {
        var color = textStyle.getObjectValue(PSClass.Color);
        obj.color = COLOR.descriptorToColorData(color);
    } else {
        var tmpColor = new SolidColor();
        tmpColor.rgb.red = 0;
        tmpColor.rgb.green = 0;
        tmpColor.rgb.blue = 0;
        obj.color = COLOR.solidColorToData(tmpColor); //If Photoshop messes up and gives us no color create a new color object (defaults to black)
    }


    if (textStyle.hasKey(PSKey.Tracking)) {
        obj.adbeTracking = textStyle.getInteger(PSKey.Tracking);
        // Adobe tracking is a value of thousandths of an em so store that value for CSS letter-spacing
        obj.letterSpacing = {
            type: 'em',
            value: (obj.adbeTracking / 1000.0).toFixed(2)
        };
    }


    if (textStyle.hasKey(PSKey.NoBreak) && textStyle.getBoolean(PSKey.NoBreak)) {
        obj.whiteSpace = 'nowrap';
    }

    if (textStyle.hasKey(PSKey.HorizontalScale)) {
        obj.adbeHorizontalScale = textStyle.getDouble(PSKey.HorizontalScale);
    }

    if (textStyle.hasKey(PSKey.VerticalScale)) {
        obj.adbeVerticalScale = textStyle.getDouble(PSKey.VerticalScale);
    }

    if (textStyle.hasKey(PSKey.SyntheticBold) && textStyle.getBoolean(PSKey.SyntheticBold)) {
        obj.adbePhxsFauxBold = true;
    } else {
        obj.adbePhxsFauxBold = false;
    }

    if (textStyle.hasKey(PSKey.SyntheticItalic) && textStyle.getBoolean(PSKey.SyntheticItalic)) {
        obj.adbePhxsFauxItalic = true;
    } else {
        obj.adbePhxsFauxItalic = false;
    }

    if (list.hasKey(PSKey.Orientation)) {
        obj.adbePhxsDirection = list.getEnumerationValue(PSKey.Orientation) === PSKey.Horizontal ? Direction.HORIZONTAL.toString() : Direction.VERTICAL.toString();
    }


    if (textStyle.hasKey(PSKey.Underline) && textStyle.getEnumerationValue(PSKey.Underline) !== PSString.UNDERLINE_TYPE_IDS[UnderlineType.UNDERLINEOFF]) {
        if (obj.textDecoration) {
            obj.textDecoration.push('underline');
        } else {
            obj.textDecoration = ['underline'];
        }
        obj.adbePhxsUnderline = textStyle.getEnumerationValue(PSKey.Underline) === PSString.underlineOnLeftInVertical ? UnderlineType.UNDERLINELEFT.toString() : UnderlineType.UNDERLINERIGHT.toString();
    }


    if (textStyle.hasKey(PSString.strikethrough) && textStyle.getEnumerationValue(PSString.strikethrough) !== PSString.STRIKETHRU_TYPE_IDS[StrikeThruType.STRIKEOFF]) {
        if (obj.textDecoration) {
            obj.textDecoration.push('line-through');
        } else {
            obj.textDecoration = ['line-through'];
        }
        obj.adbePhxsStrikethru = textStyle.getEnumerationValue(PSString.strikethrough) === PSString.STRIKETHRU_TYPE_IDS[StrikeThruType.STRIKEHEIGHT] ? StrikeThruType.STRIKEHEIGHT.toString() : StrikeThruType.STRIKEBOX.toString();
    }

    obj.fontFeatureSettings = [];
    if (textStyle.hasKey(PSKey.OldStyle) && textStyle.getBoolean(PSKey.OldStyle)) {
        obj.fontFeatureSettings.push('onum');
    }

    if (textStyle.hasKey(PSKey.AltLigature) && textStyle.getBoolean(PSKey.AltLigature)) {
        obj.fontFeatureSettings.push('dlig');
    }

    if (textStyle.hasKey(PSKey.Ligature) && textStyle.getBoolean(PSKey.Ligature)) {
        obj.fontFeatureSettings.push('liga');
    }

    if (textStyle.hasKey(PSKey.StylisticAlternates) && textStyle.getBoolean(PSKey.StylisticAlternates)) {
        obj.fontFeatureSettings.push('salt');
    }

    if (textStyle.hasKey(PSKey.Swash) && textStyle.getBoolean(PSKey.Swash)) {
        obj.fontFeatureSettings.push('swsh');
    }

    if (textStyle.hasKey(PSKey.Fractions) && textStyle.getBoolean(PSKey.Fractions)) {
        obj.fontFeatureSettings.push('frac');
    }

    if (textStyle.hasKey(PSKey.Titling) && textStyle.getBoolean(PSKey.Titling)) {
        obj.fontFeatureSettings.push('titl');
    }

    if (textStyle.hasKey(PSKey.ContextualLigatures) && textStyle.getBoolean(PSKey.ContextualLigatures)) {
        obj.fontFeatureSettings.push('clig');
    }

    if (textStyle.hasKey(PSKey.Ordinals) && textStyle.getBoolean(PSKey.Ordinals)) {
        obj.fontFeatureSettings.push('ordn');
    }

    if (textStyle.hasKey(PSKey.Ornaments) && textStyle.getBoolean(PSKey.Ornaments)) {
        obj.fontFeatureSettings.push('ornm');
    }

    if (textStyle.hasKey(PSKey.FontCaps)) {
        var id = UTIL.idToConstant(textStyle.getEnumerationValue(PSKey.FontCaps), PSString.TEXT_CASE_IDS);
        if (id === TextCase.SMALLCAPS.toString()) {
            obj.fontFeatureSettings.push('smcp');
        } else if (id === TextCase.ALLCAPS.toString()) {
            obj.textTransform = 'capitalize';
        }
    }

    if (textStyle.hasKey(PSKey.Baseline)) {
        var superSubValue = textStyle.getEnumerationValue(PSKey.Baseline);
        if (superSubValue === PSKey.SuperScript) {
            obj.fontFeatureSettings.push('sups');
        } else if (superSubValue === PSKey.SubScript) {
            obj.fontFeatureSettings.push('subs');
        }
    }

    //If we have no open type settings delete the empty array
    if (obj.fontFeatureSettings.length === 0) {
        delete obj.fontFeatureSettings;
    }

    // Set Auto Kerning
    if (textStyle.hasKey(PSKey.AutoKerning)) {
        var autoKernValue = UTIL.idToConstant(textStyle.getEnumerationValue(PSKey.AutoKerning), PSString.AUTO_KERN_IDS);
        obj.adbePhxsAutoKerning = autoKernValue.toString();
    }

    // Get Anti Alias Method
    if (list.hasKey(PSString.ANTI_ALIAS)) {
        var antiAliasValue = UTIL.idToConstant(list.getEnumerationValue(PSString.ANTI_ALIAS), PSString.ANTI_ALIAS_IDS);
        obj.adbePhxsAntiAliasMethod = antiAliasValue.toString();
    }


    return obj;
};


TEXT.getStylePostScriptName = function (style) {
    app.refreshFonts();
    var i;
    var fontPostScriptName = false;
    if (style.adbeFont) {
        try {
            //If the font is not available then getByName throws an exception
            app.fonts.getByName(style.adbeFont.postScriptName);
            fontPostScriptName = style.adbeFont.postScriptName;
        } catch (ignore) { }
    } else if (style.fontFamily) {
        //If all we have is the font-family then try to use that
        var font;
        for (i = 0; i < app.fonts.length; i++) {
            font = app.fonts[i];
            if (font.family === style.fontFamily) {
                fontPostScriptName = font.postScriptName;
                break;
            }
        }
    }
    return fontPostScriptName;
};


TEXT.isFontAvailable = function (style) {
    return TEXT.getStylePostScriptName(style) !== false;
};


TEXT.applyStyleToText = function (layerIndex, style, fontPostScriptName) {
    var i;
    // Get the text descriptor for the current layer
    var ref = new ActionReference();
    ref.putProperty(PSClass.Property, PSKey.Text); // only retrieve text info
    ref.putIndex(PSClass.Layer, layerIndex);
    var resultDesc = executeActionGet(ref);

    // If the resultDesc does not contain any text information we
    // are looking at a non text layer and should abort
    if (!resultDesc.hasKey(PSKey.Text)) {
        return;
    }

    //Retrieve Font Information once for all applications of the
    if (fontPostScriptName === undefined) {
        fontPostScriptName = TEXT.getStylePostScriptName(style);
    }

    // Get the text information descriptor
    var textDesc = resultDesc.getObjectValue(PSKey.Text);

    // Rather than round-tripping the descriptor with our mods, we start with
    // an empty descriptor and only fill in what we need, thereby providing a
    // "sparse" descriptor.
    //
    // Given recent optimizations to Photoshop, this isn't critical anymore,
    // but it does provide marginal gains in some cases. Omitting the paragraph
    // style ranges, which we do not modify, is definitelly still important.
    var newTextDesc = new ActionDescriptor();

    // Tell PS that we want to merge the style attributes we are providing with
    // the layer's existing style, rather than having un-specified attributes get
    // changed to their default values. Necessary when not round-tripping.
    newTextDesc.putBoolean(PSKey.Merge, true);

    // If there is a transform that has scaling, remove the scaling from the
    // transform. This will result in copy/paste and PS native char/paragraph
    // styles capturing the values that the user sees, rather than the internal
    // values prior to the transform-scaling.
    if (textDesc.hasKey(PSKey.Transform)) {
        var xformYScale = 1.0;
        var sx = 0;
        var sy = 0;

        var xformDesc = textDesc.getObjectValue(PSKey.Transform);

        var xfm = function (key) { return xformDesc.getDouble(key); };
        var sqr = function (x) { return x * x; };

        // Re-construct the rotate parameters from the matrix
        var r1 = Math.atan2(xfm(PSKey.Yx), xfm(PSKey.Yy));
        var r2 = Math.atan2(-xfm(PSKey.Xy), xfm(PSKey.Xx));

        // Reset the matrix to account for the new scale.

        // If both rotates are the "same", treat it as a rotate + scale
        // matrix, Otherwise, treat it as a skew matrix, taking
        // the skew values (vx, vy) from the source matrix
        var treatAsRotate = (Math.abs(r1 - r2) < 0.0001);

        // Re-construct the scale values
        if (treatAsRotate) {
            sx = Math.sqrt(sqr(xfm(PSKey.Xx)) + sqr(xfm(PSKey.Xy)));
            sy = Math.sqrt(sqr(xfm(PSKey.Yx)) + sqr(xfm(PSKey.Yy)));
        } else {
            sx = xfm(PSKey.Xx);
            sy = xfm(PSKey.Yy);
        }

        // remember our scaling so we can scale the box
        xformYScale = sy;

        if (xformYScale !== 1.0) {

            // Factor out the y scaling from the transform
            sx = sx / xformYScale;
            sy = 1;

            // Now that we have calculated all the new values, update the desc
            if (treatAsRotate) {
                xformDesc.putDouble(PSKey.Xx, sx * Math.cos(r1));
                xformDesc.putDouble(PSKey.Xy, -sx * Math.sin(r1));
                xformDesc.putDouble(PSKey.Yx, sy * Math.sin(r1));
                xformDesc.putDouble(PSKey.Yy, sy * Math.cos(r1));
            } else {
                // Factor out the scale matrix to get the original skew values.
                var vx = xfm(PSKey.Yx) / sy;
                var vy = xfm(PSKey.Xy) / sx;

                xformDesc.putDouble(PSKey.Xx, sx);
                xformDesc.putDouble(PSKey.Xy, sx * vy);
                xformDesc.putDouble(PSKey.Yx, sy * vx);
                xformDesc.putDouble(PSKey.Yy, sy);
            }

            // put the modified xform desc back into the text desc
            newTextDesc.putObject(PSKey.Transform, PSKey.Transform, xformDesc);

            // If we set the transform, then we need to propagate the click point
            // which controls the position of point type layers.
            if (textDesc.hasKey(PSKey.TextClickPoint)) {
                newTextDesc.putObject(PSKey.TextClickPoint, PSClass.Point, textDesc.getObjectValue(PSKey.TextClickPoint));
            }

            // We can't modify nested descriptor values in-place, so here we loop through
            // the text shape list, modify each style descriptor, and build up a
            // new range list to put back in the master descriptor.
            var newShapeList = new ActionList();

            var shapeList = textDesc.getList(PSKey.TextShape);
            var shapeDesc, boundDesc;

            for (i = 0; i < shapeList.count; i++) {

                shapeDesc = shapeList.getObjectValue(i);

                if (shapeDesc.getEnumerationValue(PSKey.Char) === PSEnum.Box) {
                    //  modify box bounds
                    boundDesc = shapeDesc.getObjectValue(PSKey.Bounds);
                    boundDesc.putDouble(PSKey.Bottom, boundDesc.getDouble(PSKey.Bottom) * xformYScale);
                    boundDesc.putDouble(PSKey.Right,  boundDesc.getDouble(PSKey.Right) * xformYScale);

                    // Update the shape with the new bounds
                    shapeDesc.putObject(PSKey.Bounds, PSKey.Bounds, boundDesc);
                }

                // Add the shape to our new list
                newShapeList.putObject(PSKey.TextShape, shapeDesc);
            }

            // Replace the text style range list with our new one
            newTextDesc.putList(PSKey.TextShape, newShapeList);

        } // xformYScale != 1.0
    }

    // Set the text direction orientation Vertical | Horizontal
    newTextDesc.putEnumerated(PSString.ORIENTATION, PSString.ORIENTATION,
                           style.adbePhxsDirection ? PSString.DIRECTION_IDS[Direction[style.adbePhxsDirection.split('.', 2)[1]]] : PSString.DIRECTION_IDS[Direction.HORIZONTAL]);

    // Set the Anti alias method
    if (style.adbePhxsAntiAliasMethod) {
        //This try catch is ugly but there is no good way to test whether the AntiAlias constants is defined or undefined in JSX
        try {
            if (AntiAlias[style.adbePhxsAntiAliasMethod.split('.', 2)[1]]) {
                newTextDesc.putEnumerated(PSString.ANTI_ALIAS, PSString.ANTI_ALIAS_TYPE, PSString.ANTI_ALIAS_IDS[AntiAlias[style.adbePhxsAntiAliasMethod.split('.', 2)[1]]]);
            }
        } catch (err) {
            newTextDesc.putEnumerated(PSString.ANTI_ALIAS, PSString.ANTI_ALIAS_TYPE, PSString.ANTI_ALIAS_IDS[style.adbePhxsAntiAliasMethod]);
        }
    }

    // We can't modify nested descriptor values in-place, so here we loop through the
    // text style range list, updating each range descriptor with a new style descriptor,
    // and build up a new range list to put back in the master descriptor.
    var newTsrList = new ActionList();

    var currTextRange, solidColor, colorDesc;
    var size, leading, baselineShift;

    var tsrList = textDesc.getList(PSClass.TextStyleRange);

    var hasFontFeatureSettings = style.fontFeatureSettings !== undefined && style.fontFeatureSettings.length > 0;

    for (i = 0; i < tsrList.count; i++) {

        // REVISIT (TBL): Construction of newTextStyle can be moved outside the loop
        // now that are are buildng a sparse descriptor, although the performance gains
        // are not perceptible.

        // Create a new text style descriptor which will contain the attributes
        // we need to modify.
        var newTextStyle = new ActionDescriptor();

        if (fontPostScriptName) {
            newTextStyle.putString(PSString.fontPostScriptName, fontPostScriptName);
        }

        //Font Size
        if (style.fontSize !== undefined) {
            size = new UnitValue(style.fontSize.value, style.fontSize.type);
            newTextStyle.putUnitDouble(PSKey.Size, UTIL.stringToUnit(size.type), size.value);
        }

        // Set Horizontal Scale
        if (style.adbeHorizontalScale !== undefined) {
            newTextStyle.putDouble(PSKey.HorizontalScale, style.adbeHorizontalScale);
        }

        // Set Vertical Scale
        if (style.adbeVerticalScale !== undefined) {
            newTextStyle.putDouble(PSKey.VerticalScale, style.adbeVerticalScale);
        }

        // Set Faux/Synthetic Bold
        if (style.adbePhxsFauxBold !== undefined) {
            newTextStyle.putBoolean(PSKey.SyntheticBold, style.adbePhxsFauxBold ? true : false);
        }

        // Set Faux/Synthetic Italics
        if (style.adbePhxsFauxItalic !== undefined) {
            newTextStyle.putBoolean(PSKey.SyntheticItalic, style.adbePhxsFauxItalic ? true : false);
        }

        //Set auto leading
        if (style.adbeAutoLeading !== undefined) {
            newTextStyle.putBoolean(PSString.AutoLeading, style.adbeAutoLeading ? true : false);
        }

        // Set Leading
        if (style.lineHeight !== undefined) {
            newTextStyle.putBoolean(PSString.AutoLeading, false);
            leading = new UnitValue(style.lineHeight.value, style.lineHeight.type);
            newTextStyle.putUnitDouble(PSKey.Leading, UTIL.stringToUnit(leading.type), leading.value);
        }

        // Set Tracking
        if (style.adbeTracking !== undefined) {
            newTextStyle.putInteger(PSKey.Tracking, style.adbeTracking);
        } else if (style.letterSpacing) {
            newTextStyle.putInteger(PSKey.Tracking, style.letterSpacing.value * 1000);
        }

        // Set Baseline shift
        if (style.baselineShift !== undefined) {
            baselineShift = new UnitValue(style.baselineShift.value, style.baselineShift.type);
            newTextStyle.putUnitDouble(PSKey.BaselineShift, UTIL.stringToUnit(baselineShift.type), baselineShift.value);
        }

        // Set Auto Kerning
        if (style.adbePhxsAutoKerning) {
            newTextStyle.putEnumerated(PSKey.AutoKerning, PSKey.AutoKerning, PSString.AUTO_KERN_IDS[AutoKernType[style.adbePhxsAutoKerning.split('.', 2)[1]]]);
        }

        // Set no break
        if (style.whiteSpace && style.whiteSpace === 'nowrap') {
            newTextStyle.putBoolean(PSKey.NoBreak, false);
        }

        //Underline - use PHXS underline if it exists or text-decoration property otherwise
        if (style.adbePhxsUnderline) {
            newTextStyle.putEnumerated(PSKey.Underline, PSKey.Underline, PSString.UNDERLINE_TYPE_IDS[UnderlineType[style.adbePhxsUnderline.split('.', 2)[1]]]);
        } else if (style.textDecoration && style.textDecoration.indexOf('underline') !== -1) {
            newTextStyle.putEnumerated(PSKey.Underline, PSKey.Underline, PSString.UNDERLINE_TYPE_IDS[UnderlineType.UNDERLINELEFT]);
        } else {
            newTextStyle.putEnumerated(PSKey.Underline, PSKey.Underline, PSString.UNDERLINE_TYPE_IDS[UnderlineType.UNDERLINEOFF]);
        }

        //StrikeThru - use PHXS strikeThru if it exists or text-decoration property otherwise
        if (style.adbePhxsStrikethru) {
            newTextStyle.putEnumerated(PSString.strikethrough, PSString.strikethrough, PSString.STRIKETHRU_TYPE_IDS[StrikeThruType[style.adbePhxsStrikethru.split('.', 2)[1]]]);
        } else if (style.textDecoration && style.textDecoration.indexOf('line-through') !== -1) {
            newTextStyle.putEnumerated(PSString.strikethrough, PSString.strikethrough, PSString.STRIKETHRU_TYPE_IDS[StrikeThruType.STRIKEHEIGHT]);
        } else {
            newTextStyle.putEnumerated(PSString.strikethrough, PSString.strikethrough, PSString.STRIKETHRU_TYPE_IDS[StrikeThruType.STRIKEOFF]);
        }

        // Set capitalization (SmallCaps/AllCaps/Normal)
        if (hasFontFeatureSettings && style.fontFeatureSettings.indexOf('smcp') !== -1) {
            newTextStyle.putEnumerated(PSKey.FontCaps, PSKey.FontCaps, PSString.TEXT_CASE_IDS[TextCase.SMALLCAPS]);
        } else if (style.textTransform === 'capitalize') {
            newTextStyle.putEnumerated(PSKey.FontCaps, PSKey.FontCaps, PSString.TEXT_CASE_IDS[TextCase.ALLCAPS]);
        } else {
            newTextStyle.putEnumerated(PSKey.FontCaps, PSKey.FontCaps, PSString.TEXT_CASE_IDS[TextCase.NORMAL]);
        }

        newTextStyle.putBoolean(PSKey.OldStyle, hasFontFeatureSettings && style.fontFeatureSettings.indexOf('onum') !== -1);

        newTextStyle.putBoolean(PSKey.AltLigature, hasFontFeatureSettings && style.fontFeatureSettings.indexOf('dlig') !== -1);

        newTextStyle.putBoolean(PSKey.Ligature, hasFontFeatureSettings && style.fontFeatureSettings.indexOf('liga') !== -1);

        newTextStyle.putBoolean(PSKey.StylisticAlternates, hasFontFeatureSettings && style.fontFeatureSettings.indexOf('salt') !== -1);

        newTextStyle.putBoolean(PSKey.Swash, hasFontFeatureSettings && style.fontFeatureSettings.indexOf('swsh') !== -1);

        newTextStyle.putBoolean(PSKey.Fractions, hasFontFeatureSettings && style.fontFeatureSettings.indexOf('frac') !== -1);

        newTextStyle.putBoolean(PSKey.Titling, hasFontFeatureSettings && style.fontFeatureSettings.indexOf('titl') !== -1);

        newTextStyle.putBoolean(PSKey.Ordinals, hasFontFeatureSettings && style.fontFeatureSettings.indexOf('ordn') !== -1);

        newTextStyle.putBoolean(PSKey.Ornaments, hasFontFeatureSettings && style.fontFeatureSettings.indexOf('ornm') !== -1);

        newTextStyle.putBoolean(PSKey.ContextualLigatures, hasFontFeatureSettings && style.fontFeatureSettings.indexOf('clig') !== -1);

        if (hasFontFeatureSettings && style.fontFeatureSettings.indexOf('subs') !== -1) {
            newTextStyle.putEnumerated(PSKey.Baseline, PSKey.Baseline, PSKey.SubScript);
        } else if (hasFontFeatureSettings && style.fontFeatureSettings.indexOf('sups') !== -1) {
            newTextStyle.putEnumerated(PSKey.Baseline, PSKey.Baseline, PSKey.SuperScript);
        } else {
            newTextStyle.putEnumerated(PSKey.Baseline, PSKey.Baseline, PSKey.BaselineNormal);
        }


        if (style.color) {
            solidColor = COLOR.dataToSolidColor(style.color);
            colorDesc = COLOR.solidColorToDescriptor(solidColor);
            newTextStyle.putObject(PSKey.Color, colorDesc.type, colorDesc.descriptor);
        }

        // Replace the current range desc's style desc with the modified one and add the
        // modified range desc to our new text style range list
        currTextRange = tsrList.getObjectValue(i);
        currTextRange.putObject(PSClass.TextStyle, PSClass.TextStyle, newTextStyle);
        newTsrList.putObject(PSClass.TextStyleRange, currTextRange);
    }

    // Replace the text style range list with our new one
    newTextDesc.putList(PSClass.TextStyleRange, newTsrList);

    // Put together a "set text" descriptor with our modified text desc
    // and execute it.

    var eventDesc = new ActionDescriptor();
    var sheetRef = new ActionReference();
    sheetRef.putIndex(PSKey.LayerKey, layerIndex);
    eventDesc.putReference(PSKey.Target, sheetRef);
    eventDesc.putObject(PSKey.To, PSClass.TextLayer, newTextDesc);
    executeAction(PSEvent.Set, eventDesc, DialogModes.NO);
};


//Retrieves all the colors used in a TextLayer
TEXT.getTextLayerColors = function () {
    var ref = new ActionReference();
    ref.putEnumerated(PSClass.Layer, PSType.Ordinal, PSEnum.Target);
    var desc = executeActionGet(ref);
    var list = desc.getObjectValue(PSKey.Text);
    var tsr = list.getList(PSClass.TextStyleRange);
    var fontColors = [];
    var i = 0;
    var tsr0, textStyle, color, colorData;

    var areEqual = function (colorData1, colorData2) {
        return JSON.stringify(colorData1[0].value) === JSON.stringify(colorData2[0].value);
    };

    var pushUnique = function (colorData) {
        var index;
        for (index = 0; index < fontColors.length; index++) {
            if (areEqual(fontColors[index], colorData)) {
                return;
            }
        }
        fontColors.push(colorData);
    };

    for (i = 0; i < tsr.count; i++) {
        tsr0 = tsr.getObjectValue(i);
        textStyle = tsr0.getObjectValue(PSClass.TextStyle);
        if (textStyle.hasKey(PSClass.Color)) {
            color = textStyle.getObjectValue(PSClass.Color);
            colorData = COLOR.descriptorToColorData(color);
            pushUnique(colorData);
        }
    }
    //If text is reporting no colors then default a black color
    if (fontColors.length === 0) {
        var tmpColor = new SolidColor();
        tmpColor.rgb.red = 0;
        tmpColor.rgb.green = 0;
        tmpColor.rgb.blue = 0;
        fontColors.push(COLOR.solidColorToData(tmpColor));
    }

    return fontColors;
};

TEXT.getLayerFont = function () {
    return TEXT.getTextItemObject(app.activeDocument.activeLayer.textItem);
};

TEXT.replaceTextStyle = function (info) {
    try {
        var docName = "textstyle-" + info.id;
        var newDoc = app.documents.add(400, 100, undefined, docName, undefined, DocumentFill.TRANSPARENT);

        //var blackColor = new SolidColor();
        //blackColor.rgb.hexValue = '000000';

        var newLayer = newDoc.artLayers[0]; //.add();
        newLayer.name = "Text Layer";
        newLayer.kind = LayerKind.TEXT;
        //newLayer.textItem.color = blackColor;
        newLayer.textItem.contents = "Text Style";
        newDoc.activeLayer = newLayer;

        TEXT.setFont(info.content[0]);

        newLayer.textItem.position = [50, 50];

        var tmpFile = new File($._ext_CORE.getTempFolder() + "/" + docName + ".psd");
        newDoc.saveAs(tmpFile, new PhotoshopSaveOptions());

        return newDoc.name;
    } catch (ex) {
        $._ext_CORE.writeToLog('PHXS.jsx-replaceTextStyle()', ex);
    }
};


TEXT.setFontImpl = function () {
    var typography = JSXGlobals.styleToApply;
    try {

        //Retrieve Font Information once for all applications of the
        var fontPostScriptName = TEXT.getStylePostScriptName(typography);

        var layers = [];
        try {
            layers = getSelectedLayerIndices();
        } catch (e) { return; }
        var layerIndex;
        for (layerIndex = 0; layerIndex < layers.length; layerIndex++) {
            TEXT.applyStyleToText(layers[layerIndex], typography, fontPostScriptName);
        }
    } catch (ex) {
        $._ext_CORE.writeToLog('PHXS.jsx-setFontImpl()', ex);
    }
};

TEXT.setFont = function (typography, historyName) {
    JSXGlobals.styleToApply = typography;

    if (!historyName) {
        historyName = "<Missing History Name>";
    }

    app.activeDocument.suspendHistory(historyName, 'TEXT.setFontImpl();');
};

TEXT.createFontLayer = function (typography, historyName) {
    try {
        function doCreateFontLayer(typography) {
            var selectedLayer = app.activeDocument.artLayers.add();
            selectedLayer.name = typography.adbeFont.family;
            selectedLayer.kind = LayerKind.TEXT;
            selectedLayer.textItem.contents = typography.adbeFont.family;

            //TEXT.applyStyleToText(selectedLayer.textItem, typography);
            TEXT.setFont(typography);
        }
        app.activeDocument.suspendHistory(historyName, "doCreateFontLayer(typography);");
    } catch (ex) {
        $._ext_CORE.writeToLog('PHXS.jsx-createFontLayer()', ex);
    }
};

TEXT.setupTextStyleForPreview = function () {
    duplicateLayerInsideDocument();

    var desc1 = new ActionDescriptor();
    var ref1 = new ActionReference();
    ref1.putProperty(PSClass.Property, PSClass.TextStyle);
    ref1.putEnumerated(PSClass.TextLayer, PSType.Ordinal, PSEnum.Target);
    desc1.putReference(PSString.Null, ref1);
    var desc2 = new ActionDescriptor();

    // Set font size
    desc2.putUnitDouble(PSKey.Size, PSUnit.Pixels, JSXGlobals.textPreviewFontSize);

    // Set font color
    var desc3 = new ActionDescriptor();
    desc3.putDouble(PSKey.Red, 0);
    desc3.putDouble(PSKey.Green, 0);
    desc3.putDouble(PSKey.Blue, 0);
    desc2.putObject(PSKey.Color, PSClass.RGBColor, desc3);

    desc1.putObject(PSKey.To, PSClass.TextStyle, desc2);
    executeAction(PSEvent.Set, desc1, DialogModes.NO);

    // Set font text
    var ndesc1 = new ActionDescriptor();
    var nref1 = new ActionReference();
    nref1.putEnumerated(PSClass.TextLayer, PSType.Ordinal, PSEnum.Target);
    ndesc1.putReference(PSString.Null, nref1);

    var descText = new ActionDescriptor();
    descText.putString(PSKey.Text, JSXGlobals.textPreviewString);
    ndesc1.putObject(PSKey.To, PSClass.TextLayer, descText);
    executeAction(PSEvent.Set, ndesc1, DialogModes.NO);

    // Clear layer style
    if (hasLayerStyles()) {
        executeAction(sTID('disableLayerStyle'), ndesc1, DialogModes.NO);
    }
};

TEXT.saveTextStylePreview = function (info) {
    try {
        var selectedLayer = app.activeDocument.activeLayer;
        if (selectedLayer && selectedLayer.kind === LayerKind.TEXT) {
            //app.activeDocument.suspendHistory('Generate Text Style Preview', 'TEXT.setupTextStyleForPreview();');

            //var dummyPSBPath = Folder.temp.fsName + "/TextPreview.psd";
            var previewPath = Folder.temp.fsName + "/TextPreview" + $.hiresTimer + ".png";
            var textColor = new SolidColor();
            textColor.rgb.red = 0; // a light yellow-ish orange, so we can check the channel values
            textColor.rgb.green = 0;
            textColor.rgb.blue = 0;

            var postScriptName = 'MyriadPro-Regular';
            try {
                postScriptName = selectedLayer.textItem.font;
            } catch (ignore) {}

            app.thumbnailText(new File(previewPath), JSXGlobals.textPreviewString, postScriptName, JSXGlobals.textPreviewFontSize, textColor);

            return previewPath;
        }

    } catch (ex) {
        $._ext_CORE.writeToLog('PHXS.jsx-saveTextStylePreview()', ex);
    }
};
