import { AfterContentInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ConnectorService, YtPlayerService } from 'app/core/services';
import { BehaviorSubject, combineLatest, fromEvent, Observable, Subscription } from 'rxjs';
import { last, take } from 'rxjs/operators';
import * as AppActions from '../../state/actions/app.actions'
@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, AfterContentInit, OnDestroy {

  @ViewChild('footMenu', { static: true }) footMenu: ElementRef;



  isReadyVideo$ = new BehaviorSubject<boolean>(false);
  currentPlaying$: Observable<string>;
  private _eventSubscriptions = new Subscription();
  private _isReadySubscription = new Subscription();

  videoId = '';
  reframed: boolean;
  player: YT.Player;
  playingStatue: string
  isloop = true;
  currentGroup: string;
  currentGroup$: Observable<string>;

  currentGroupFormControl = new FormControl('');
  private _groupID: string;
  priviouseGroup$: Observable<string>;
  constructor(
    public ytPlayerService: YtPlayerService,
    public tubeConnect: ConnectorService,
    private store: Store<any>,
  ) { }


  /** Special Features
   * special feature for this component
   */
  addListeners(): void {
    const _footMenuHTML = (this.footMenu.nativeElement as HTMLElement);
    const _footoptionArea = _footMenuHTML.querySelector('.foot-menu-area');

    const mouseEnter = fromEvent(_footMenuHTML, 'mouseenter').subscribe(() => {
      _footoptionArea.classList.remove('fadeout');
      _footoptionArea.classList.add('fadein');
    });

    const mouseLeave = fromEvent(_footMenuHTML, 'mouseleave').subscribe(() => {
      _footoptionArea.classList.remove('fadein');
      _footoptionArea.classList.add('fadeout');
    });

    const currentPlaying = this.currentPlaying$.subscribe(playTag => {
      if (playTag.length > 0) {
        this.videoId = playTag;
        this.tubeConnect.serveConnection.invoke('SendGroupTubeLink', this._groupID, playTag);
      }
    })

    const isConnected = this.tubeConnect.isConnected$.subscribe((isconnected) => {
      const tempgroup = this._groupID;
      if (isconnected) {
        this.tubeConnect.serveConnection.invoke('AddGroup', this._groupID, tempgroup);
      }
    })
    this._eventSubscriptions.add(mouseLeave);
    this._eventSubscriptions.add(mouseEnter);
    this._eventSubscriptions.add(currentPlaying);
    this._eventSubscriptions.add(isConnected);
  }

  startVideo(): void {

    this.player = this.ytPlayerService.startVideo(this.videoId);

    this._eventSubscriptions.add(this.player.addEventListener('onStateChange', evt => {
      const isloop: boolean = this.isloop;
      if (evt['data'] === YT.PlayerState.ENDED && isloop) {
        this.player.playVideo();
      }

    }))
  }

  shareVideo(): void {
    this.tubeConnect.serveConnection.invoke('SendTubeLink', this.videoId);
  }

  switchLoop(): void {
    this.isloop = this.isloop ? false : true;
    if (this.player.getPlayerState() === YT.PlayerState.ENDED) {
      this.player.playVideo();
    }
  }

  /** DataControls
   * Store Data get/set
   */
  getStoreDatas(): void {
    this.currentPlaying$ = this.store.select(
      state => state.appState.currentPlaying
    )

    this.currentGroup$ = this.store.select(
      state => state.appState.currentGroup
    )

    this.priviouseGroup$ = this.store.select(
      state => state.appState.priviousGroup
    )
  }

  enterCurrentGroup(): void {
    const currentGroup = this.currentGroup$.pipe(take(1));
    const priviousGroup = this.priviouseGroup$.pipe(take(1));

    const combined = combineLatest([currentGroup, priviousGroup]);

    combined.pipe(last()).subscribe(([current, privious]) => {
      if (current) {
        this.tubeConnect.serveConnection.invoke('AddGroup', current, privious);
        this.store.dispatch(AppActions.setPriviousGroup({ priviousGroup: current }))
        this.currentGroupFormControl.setValue(current);
        this._groupID = current;
      }
    }

    )
  }



  /** LifeCycles
   * lifeCycle hooks below
   */

  ngAfterContentInit(): void {
    this.getStoreDatas();
    this.enterCurrentGroup();
    this.addListeners();
    this.startVideo();

  }

  ngOnDestroy(): void {
    this._eventSubscriptions.unsubscribe();
    this._isReadySubscription.unsubscribe();
  }

  ngOnInit(): void {

  }


}
