# Microsoft Developer Studio Project File - Name="ExampleProject" - Package Owner=<4>
# Microsoft Developer Studio Generated Build File, Format Version 6.00
# ** DO NOT EDIT **

# TARGTYPE "Win32 (x86) Application" 0x0101

CFG=ExampleProject - Win32 Debug
!MESSAGE This is not a valid makefile. To build this project using NMAKE,
!MESSAGE use the Export Makefile command and run
!MESSAGE 
!MESSAGE NMAKE /f "ExampleProject.mak".
!MESSAGE 
!MESSAGE You can specify a configuration when running NMAKE
!MESSAGE by defining the macro CFG on the command line. For example:
!MESSAGE 
!MESSAGE NMAKE /f "ExampleProject.mak" CFG="ExampleProject - Win32 Debug"
!MESSAGE 
!MESSAGE Possible choices for configuration are:
!MESSAGE 
!MESSAGE "ExampleProject - Win32 Release" (based on "Win32 (x86) Application")
!MESSAGE "ExampleProject - Win32 Debug" (based on "Win32 (x86) Application")
!MESSAGE 

# Begin Project
# PROP AllowPerConfigDependencies 0
# PROP Scc_ProjName ""
# PROP Scc_LocalPath ""
CPP=cl.exe
MTL=midl.exe
RSC=rc.exe

# Begin Source File

SOURCE=.\main.cpp
# End Source File

# Begin Group "헤더 파일"
# PROP Default_Filter "h;hpp;hxx;hm;inl"

# Begin Source File
SOURCE=.\include\common.h
# End Source File

# End Group

# Begin Group "소스 파일"
# PROP Default_Filter "cpp;c;cxx;rc;def;r;odl;idl;hpj;bat"

# Begin Source File
SOURCE=.\src\module1.cpp
# End Source File

# Begin Source File
SOURCE=.\src\module2.cpp
# End Source File

# End Group

# Begin Group "리소스 파일"
# PROP Default_Filter "ico;cur;bmp;dlg;rc2;rct;bin;rgs;gif;jpg;jpeg;jpe"

# Begin Source File
SOURCE=.\res\app.ico
# End Source File

# Begin Source File
SOURCE=.\res\app.rc
# End Source File

# End Group

# End Project
