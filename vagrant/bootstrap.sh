#!/usr/bin/env bash

pacman -Sy
pacman -Su --noconfirm
pacman -S --noconfirm --needed nodejs npm mongodb
systemctl enable mongodb
systemctl start mongodb
npm install -g gulp
