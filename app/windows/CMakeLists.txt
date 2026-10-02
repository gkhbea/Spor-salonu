cmake_minimum_required(VERSION 3.14)
project(fittrack_pt_app LANGUAGES CXX)

set(BINARY_NAME "fittrack_pt_app")

cmake_policy(SET CMP0079 NEW)

# Flutter Windows konfigürasyonu
set(CMAKE_INSTALL_RPATH "$ORIGIN/lib")
set(CMAKE_BUILD_WITH_INSTALL_RPATH TRUE)

add_definitions(-DUNICODE -D_UNICODE)

add_subdirectory(flutter)
