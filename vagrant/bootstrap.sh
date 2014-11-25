#!/usr/bin/env bash

pacman -Sy --noconfirm nodejs mongodb
systemctl enable mongodb
systemctl start mongodb
npm install -g gulp
