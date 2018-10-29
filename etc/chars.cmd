@ECHO OFF
SET font="%windir%\Fonts\msgothic.ttc"
SET name="MS PGothic"

REM Windows XP  TTFDump v1.8

SET dump=TTFDUMP %font% -nx -h
SET cmap="%TMP%\cmap.txt"

FOR /F "tokens=5,7" %%i IN ('%dump%') DO SET range=%%i,1,%%j
FOR /L %%i IN (%range%) DO (
	CALL :exec -c%%i
	IF NOT ERRORLEVEL 1 EXIT /B
)
EXIT /B 1

:exec
%dump% -tname %1 | FINDSTR /EC:%name% > NUL
IF ERRORLEVEL 1 EXIT /B 1
%dump% -tcmap %1 > %cmap%

FOR /F "delims=:" %%i IN ('FINDSTR /EINC:"Which Means:" %cmap%') DO (
	SET skip=%%i
	GOTO read
)
EXIT /B 1

:write
SET /P char="%1 " < NUL
EXIT /B

:read
FOR /F "usebackq skip=%skip% tokens=2,3" %%i IN (%cmap%) DO (
	IF "%%i"=="Char" (CALL :write %%j) ELSE (CALL :write %%i)
)
ECHO.
