on run argv
	if (count of argv) is less than 3 then error "Usage: run-photoshop-manifest.applescript manifestPath originalFolder outputFolder"
	
	set manifestPath to item 1 of argv
	set originalFolderPath to item 2 of argv
	set outputFolderPath to item 3 of argv
	
	set adapterPath to POSIX path of (path to me)
	set adapterFolderPath to my parentFolderPath(adapterPath)
	set jsxPath to adapterFolderPath & "/remove-background.jsx"
	
	set escapedManifest to my escapeForJs(manifestPath)
	set escapedOriginal to my escapeForJs(originalFolderPath)
	set escapedOutput to my escapeForJs(outputFolderPath)
	set escapedJsx to my escapeForJs(jsxPath)
	
	set bootstrap to "$.global.__SPX_PS_ADAPTER_ARGS__ = { manifestPath: '" & escapedManifest & "', originalFolder: '" & escapedOriginal & "', outputFolder: '" & escapedOutput & "' }; $.evalFile('" & escapedJsx & "');"
	set runtimeScript to "tell application id \"com.adobe.Photoshop\"" & return & "activate" & return & "do javascript " & my quoteForAppleScript(bootstrap) & return & "end tell"
	
	run script runtimeScript
end run

on escapeForJs(rawText)
	set escaped to rawText
	set escaped to my replaceText("\\", "\\\\", escaped)
	set escaped to my replaceText("'", "\\'", escaped)
	return escaped
end escapeForJs

on quoteForAppleScript(rawText)
	set escaped to rawText
	set escaped to my replaceText("\\", "\\\\", escaped)
	set escaped to my replaceText("\"", "\\\"", escaped)
	return "\"" & escaped & "\""
end quoteForAppleScript

on parentFolderPath(filePath)
	set oldDelimiters to AppleScript's text item delimiters
	set AppleScript's text item delimiters to "/"
	set pathParts to text items of filePath
	if (count of pathParts) > 0 then set pathParts to items 1 thru -2 of pathParts
	set AppleScript's text item delimiters to "/"
	set folderPath to pathParts as text
	set AppleScript's text item delimiters to oldDelimiters
	return folderPath
end parentFolderPath

on replaceText(findText, replaceTextValue, sourceText)
	set oldDelimiters to AppleScript's text item delimiters
	set AppleScript's text item delimiters to findText
	set textItems to text items of sourceText
	set AppleScript's text item delimiters to replaceTextValue
	set joinedText to textItems as text
	set AppleScript's text item delimiters to oldDelimiters
	return joinedText
end replaceText
