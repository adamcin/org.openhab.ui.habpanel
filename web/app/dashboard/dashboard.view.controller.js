  angular
        .module('app')
        .controller('DashboardViewCtrl', DashboardViewController);

  DashboardViewController.$inject = ['$scope', '$location', '$rootScope', '$routeParams', '$timeout', 'dashboard', 'PersistenceService', 'OHService', 'Fullscreen', 'snapRemote', 'SpeechService'];
  function DashboardViewController($scope, $location, $rootScope, $routeParams, $timeout, dashboard, PersistenceService, OHService, Fullscreen, snapRemote, SpeechService) {
    var vm = this;
    vm.dashboard = dashboard;

    vm.gridsterOptions = {
        margins: (vm.dashboard.widget_margin) ?
                    [vm.dashboard.widget_margin, vm.dashboard.widget_margin] : [5, 5],
        columns: vm.dashboard.columns || 12,
        rowHeight: vm.dashboard.row_height || 'match',
        pushing: false,
        floating: false,
        mobileModeEnabled: (vm.dashboard.mobile_mode_enabled || false),
        mobileBreakpoint: (vm.dashboard.mobile_mode_enabled && vm.dashboard.mobile_breakpoint || undefined),
        draggable: { enabled: false },
        resizable: { enabled: false }
    };

    var fullscreenhandler = Fullscreen.$on('FBFullscreen.change', function(evt, enabled) {
        vm.fullscreen = enabled;
    });

    $scope.$on('$destroy', function() {
        fullscreenhandler();
        //OHService.clearAllLongPollings();
    });

    OHService.onUpdate($scope, '', function () {
        vm.ready = true;
        // for sliders
        $timeout(function () {
            $scope.$broadcast('rzSliderForceRender');
        });
    });

    activate();

    ////////////////

    function activate() {
        $timeout(function() {
            OHService.reloadItems();
            OHService.getLocale();
        });
        if ($rootScope.settings.no_scrolling) iNoBounce.enable(); else iNoBounce.disable();
        if ($routeParams.kiosk) $rootScope.kioskMode = ($routeParams.kiosk == 'on');
        if ($rootScope.kioskMode) {
            snapRemote.getSnapper().then(function (snapper) {
                snapper.disable();
            })
        }
    }

    vm.refresh = function() {
        OHService.reloadItems();
    };

    vm.goFullscreen = function() {
        Fullscreen.toggleAll();
    };

    vm.toggleEdit = function() {
        $location.url("/edit/" + dashboard.id);
    };


    // Speech recognition
    vm.isListening = false;
    vm.supportsSpeech = SpeechService.isSpeechRecognitionSupported();

    vm.listen = function() {
        if (!vm.supportsSpeech) {
            console.error('No support for speech recognition on this platform!');
            return;
        }

        vm.speechOutput = 'Speak now...';

        var stopListener = $rootScope.$on('speech-recognition', function (e, args) {
            if (args.interim_transcript) {
                vm.speechOutput = args.interim_transcript;
            } else if (args.final_transcript) {
                vm.speechOutput = args.final_transcript;
                OHService.sendVoice(vm.speechOutput);
                SpeechService.stopSpeechRecognition();
            } else if (args.stop_listening) {
                stopListener();
                $timeout(function () {
                    vm.isListening = false;
                }, 2000);
            } else if (args.error) {
                vm.speechOutput = "Error: " + args.error;
                SpeechService.stopSpeechRecognition();
            }
        });

        OHService.getLocale().then(function (locale) {
            vm.isListening = true;
            SpeechService.startSpeechRecognition(locale);
        });
    }

    vm.stopListening = function () {
        SpeechService.stopSpeechRecognition();
    }
  }
