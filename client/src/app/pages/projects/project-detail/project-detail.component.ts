import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Component, OnInit } from '@angular/core';
import { User } from '@angular/fire/auth';
import { ActivatedRoute, Router } from '@angular/router';
import { NbDialogService, NbToastrService } from '@nebular/theme';
import { ProjectModel } from 'src/app/models/project.model';
import { TaskModel } from 'src/app/models/task.model';
import { ProjectService } from 'src/app/services/project/project.service';
import { TaskService } from 'src/app/services/task/task.service';
import { UserService } from 'src/app/services/user/user.service';
import { NewTaskDialogComponent } from './components/new-task-dialog/new-task-dialog.component';
import { ProjectInfoDialogComponent } from './components/project-info-dialog/project-info-dialog.component';
import { ShareProjectDialogComponent } from './components/share-project-dialog/share-project-dialog.component';

@Component({
  selector: 'app-project-detail',
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.scss']
})
export class ProjectDetailComponent implements OnInit {

  projectInfo!: ProjectModel;
  tasks: TaskModel[] = [];
  todoTasks: TaskModel[] = [];
  doingTasks: TaskModel[] = [];
  doneTasks: TaskModel[] = [];
  selectedTab = 0;
  colTasks = [
    "todoList",
    "doingList",
    "doneList",
  ];

  tabOptions = [
    {
      title: 'By status',
      icon: 'archive-outline',
      link: 'all',
    },
    {
      title: 'By label',
      icon: 'pricetags-outline',
      link: 'label',
    },
    {
      title: 'Due date',
      icon: 'calendar-outline',
      link: 'date',
    },
  ]
  // user!: User;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectService: ProjectService,
    private toastrService: NbToastrService,
    private dialogService: NbDialogService,
    public taskService: TaskService,
    public userService: UserService,
  ) { }

  ngOnInit(): void {
    // this.user = JSON.parse(localStorage.getItem('user') || '{}');
    this.tabOptions.find(tab => {
      if (tab.link === this.router.url || this.router.url.includes(tab.link)) {
        this.selectedTab = this.tabOptions.indexOf(tab);
      }
    })
    this.projectService.getProject(this.route.snapshot.paramMap.get('id')).subscribe((projectInfo) => {
      this.userService.getUserById(projectInfo.owner).subscribe((res) => {
        projectInfo.members.push(res)
      })
      this.projectService.projectInfo = projectInfo
      this.projectInfo = projectInfo
      this.taskService.getTasksByProjectId(projectInfo.project_id).subscribe((res) => {
        if (res) {
          this.tasks = res.reverse();
          this.filterTasks();
        }
      });
    })
  }

  selectTab(index: number) {
    this.selectedTab = index;
    this.router.navigate([`/projects/${this.projectInfo.project_id}/${this.tabOptions[index].link}`])
  }

  goBack() {
    window.history.back();
  }

  filterTasks() {
    this.todoTasks = this.tasks.filter((task) => task.status === 0);
    this.doingTasks = this.tasks.filter((task) => task.status === 1);
    this.doneTasks = this.tasks.filter((task) => task.status === 2);
  }

  openAddTaskDialog() {
    this.dialogService.open(NewTaskDialogComponent, {
      context: {
        project: this.projectInfo,
      },
    }).onClose.subscribe((task: TaskModel) => {
      if (task) {
        this.todoTasks.unshift(task);
      }
      this.taskService.getTasksByProjectId(this.projectInfo.project_id).subscribe((res) => {
        if (res) {
          this.tasks = res;
          this.filterTasks();
        }
      });
    });
  }

  openShareDialog() {
    this.dialogService.open(ShareProjectDialogComponent, {
      context: {
        project: this.projectInfo,
      },
    });
  }

  openProjectInfoDialog() {
    this.dialogService.open(ProjectInfoDialogComponent, {
      context: {
        project: this.projectInfo,
      },
    });
  }

  updateTaskStatusEvent(task: TaskModel) {
    this.taskService.getTasksByProjectId(this.projectInfo.project_id).subscribe((res) => {
      if (res) {
        this.tasks = res;
        this.filterTasks();
      }
    });
  }

  deleteTaskStatusEvent(task: TaskModel) {
    // this.taskService.getTasksByProjectId(this.projectInfo.project_id).subscribe((res) =>{
    //   if(res){
    //     this.tasks = res;
    //     this.filterTasks();
    //   }
    // });
    this.tasks.splice(this.tasks.indexOf(task), 1);
    this.filterTasks();
    console.log(this.tasks)
  }

  deleteProject() {
    if (this.userService.user.uid === this.projectInfo.owner) {
      // this.taskService.deleteTasksByProjectId(this.projectInfo.project_id).subscribe(
      //   () => {}
      // );
      let updatedProject = {
        ...this.projectInfo,
        disabled: true,
      }
      this.projectService.deleteProjectById(this.projectInfo.project_id, updatedProject).subscribe(
        (res) => {
          this.toastrService.show('Success', 'Delete successfully!', {
            status: 'success',
          });
        }
      )
      window.history.back();
      return;
    }
    this.toastrService.show('Error', 'You are not the owner of this project', {
      status: 'danger',
    });
    return;

  }


  drop(event: CdkDragDrop<any[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    }

    if (event.container.id != event.previousContainer.id) {
      if (event.container.id == 'cdk-drop-list-0') {
        this.updateTaskFunc(event.container.data[event.currentIndex], 0);
      } else if (event.container.id == 'cdk-drop-list-1') {
        this.updateTaskFunc(event.container.data[event.currentIndex], 1);
      } else {
        this.updateTaskFunc(event.container.data[event.currentIndex], 2);
      }
    }
  }

  updateTaskFunc(task: any, status: any) {
    const data = {
      ...task,
      status: status,
      updatedDate: Date.now(),
    };
    this.tasks.findIndex((task) => {
      if (task.task_id === data.task_id) {
        task.status = data.status;
      }
    });
    this.filterTasks();
    this.taskService.updateTaskById(data.task_id, data).subscribe((res) => {
      if (res == 'Updated successfully') {
        this.toastrService.success('Task updated successfully', 'Success');
      }
    });
  }

}
