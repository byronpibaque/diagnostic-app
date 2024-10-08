import {Component, OnInit, ViewChild} from '@angular/core';
import { MenuItem, Message, MessageService } from 'primeng/api';
import { PanelMenuModule } from 'primeng/panelmenu';
import { ClinicService } from '../../../../services/clinic.service';
import { ToastModule } from "primeng/toast";
import { Appointment } from "../../../../models/respose/Appointment";
import { DialogModule } from "primeng/dialog";
import { ButtonModule } from "primeng/button";
import { CalendarModule } from "primeng/calendar";
import { DropdownModule } from "primeng/dropdown";
import { FormsModule } from "@angular/forms";
import {User} from "../../../../models/respose/User";
import {selectUser} from "../../../../store/selectors/user.selectors";
import {Observable} from "rxjs";
import {JwtPayloadUser} from "../../../../models";
import {Store} from "@ngrx/store";
import {CommonModule} from "@angular/common";
import {Consultation, ResultadoExamen} from "../../../../models/respose/Consultation";
import {DividerModule} from "primeng/divider";
import {ConsultationReq, Sintomas} from "../../../../models/request/ConsultationReq";
import {MultiSelectModule} from "primeng/multiselect";
import {InputTextareaModule} from "primeng/inputtextarea";
import {FileUpload, FileUploadModule} from "primeng/fileupload";
import {Ripple} from "primeng/ripple";

@Component({
    selector: 'app-clinic',
    standalone: true,
    imports: [PanelMenuModule, CommonModule,
        FileUploadModule, ToastModule, DialogModule, ButtonModule, CalendarModule, DropdownModule, FormsModule, DividerModule, MultiSelectModule, InputTextareaModule, FileUploadModule, Ripple],
    templateUrl: './clinic.component.html',
    styleUrls: ['./clinic.component.scss']
})
export class ClinicComponent implements OnInit {
    panelMenuItems: MenuItem[] = [];
    clinics: any[] = [];
    doctors: any[] = [];
    users: User[] = [];
    rol: string;
    id: string;
    medico_id: string;
    allAppointments: any[] = [];
    selectedDoctorId: number | null = null;
    expandedState: { [key: number]: boolean } = {};
    newConsulta: ConsultationReq;
    archivo: File;

    msgs: Message[] = [];
    appointment: Appointment = new Appointment();
    display: boolean = false;
    modalConsulta: boolean = false;
    modalResultado: boolean = false;

    consulta: Consultation;
    examen: ResultadoExamen[];

    user$: Observable<JwtPayloadUser | null> = this.store.select(selectUser);
    sintomasOptions: Sintomas[];

    estadoOptions = [
        { label: 'Disponible', value: 'Disponible' },
        { label: 'No Disponible', value: 'No Disponible' }
    ];

    @ViewChild('fileUpload') fileUpload: FileUpload;

    constructor(private clinicService: ClinicService, private messageService: MessageService, private store: Store) {}

    ngOnInit(): void {
        this.loadClinicsAndDoctors();
        this.loadUsers();
        this.id = localStorage.getItem('id');
        this.rol = localStorage.getItem('role');
        this.medico_id = localStorage.getItem('medicoId')
        this.newConsulta = new ConsultationReq();
        if (this.fileUpload) {
            this.fileUpload.clear();
        }
    }

    loadClinicsAndDoctors(): void {
        this.clinicService.getClinics().subscribe(
            clinics => {
                this.clinics = clinics.filter(clinic => clinic.estado === 'Activo');
                this.loadDoctors();
            },
            error => {
                console.error('Error loading clinics', error);
            }
        );
    }
    loadDetailConsultation(id: number): void {
        this.clinicService.getConsultation(id).subscribe(
            detail => {
                this.consulta = detail;
                this.examen = this.consulta.resultadoExamen;
                this.examen.forEach(examen => {
                    examen.resultado = JSON.parse(examen.resultado as unknown as string);
                });
            },
            error => {
                this.hideDialogConsulta();
                this.showAlert('info', 'Info', 'Aun no se ha terminado de analizar la consulta');
            }
        );
    }

    loadDoctors(): void {
        this.clinicService.getDocs().subscribe(
            doctors => {
                this.doctors = doctors.filter(doctor => doctor.estado === 'Activo');
                this.loadAppointments();
            },
            error => {
                console.error('Error loading doctors', error);
            }
        );
    }

    loadUsers(): void {
        this.clinicService.getUsers().subscribe(
            users => {
                this.users = users.filter(user => user.estado === 'Activo');
            },
            error => {
                console.error('Error loading users', error);
            }
        );
    }

    loadSintomas(): void {
        this.clinicService.getSintomas().subscribe(
            sintomas => {
                this.sintomasOptions = sintomas.filter(sintomas => sintomas.estado === 'activo');
            },
            error => {
                console.error('Error loading sintomas', error);
            }
        );
    }


    loadAppointments(): void {
        this.clinicService.getAppointments().subscribe(
            appointments => {
                this.allAppointments = appointments;
                this.updateMenuItems();
            },
            error => {
                console.error('Error loading appointments', error);
            }
        );
    }

    updateMenuItems(): void {
        const currentExpandedState = { ...this.expandedState };

        this.panelMenuItems = this.clinics.map(clinic => ({
            label: clinic.nombre,
            expanded: currentExpandedState[clinic.id_institucion_medica] ?? true,
            items: [
                {
                    label: 'Detalles',
                    icon: 'pi pi-fw pi-info',
                    items: [
                        { label: `Address: ${clinic.direccion}`, icon: 'pi pi-fw pi-home' },
                        { label: `Phone: ${clinic.telefono}`, icon: 'pi pi-fw pi-phone' },
                        { label: `Status: ${clinic.estado}`, icon: 'pi pi-fw pi-check-circle' }
                    ]
                },
                {
                    label: 'Médicos Disponibles',
                    icon: 'pi pi-fw pi-book',
                    items: this.getDoctorsForClinic(clinic.id_institucion_medica)
                        //.filter(doctor => this.rol == 'MEDICO' || doctor.id_medico === this.medico_id)
                        .map(doctor => ({
                            label: doctor.nombre,
                            icon: 'pi pi-fw pi-user',
                            expanded: currentExpandedState[doctor.id_medico] ?? true,
                            items: [
                                { label: `Especialidad: ${doctor.especialidad}`, icon: 'pi pi-fw pi-star' },
                                { label: `Email: ${doctor.email}`, icon: 'pi pi-fw pi-envelope' },
                                { label: `Phone: ${doctor.telefono}`, icon: 'pi pi-fw pi-phone' },
                                {
                                    label: 'Citas Disponibles',
                                    icon: 'pi pi-fw pi-calendar',
                                    items: [
                                        ...(this.rol == 'MEDICO' ? [{
                                            label: 'Crear cita',
                                            icon: 'pi pi-fw pi-calendar-plus',
                                            command: () => this.openAppointmentDialog(doctor.id_medico)
                                        }] : []),
                                        ...this.getAppointmentsForDoctor(doctor.id_medico)
                                    ]
                                }
                            ]
                        }))
                }
            ]
        }));

        this.expandedState = { ...currentExpandedState };
    }

    getDoctorsForClinic(clinicId: number): any[] {
        return this.doctors.filter(doctor => doctor.institucion_medica_id === clinicId);
    }

    getAppointmentsForDoctor(doctorId: number): MenuItem[] {
        return this.allAppointments
            .filter(appointment => appointment.medico_id === doctorId && appointment.estado !== 'Eliminado')
            .map(appointment => ({
                label: `Fecha: ${new Date(appointment.fecha_hora).toLocaleString()}`,
                icon: 'pi pi-fw pi-calendar',
                items: [
                    ...(appointment.estado === 'Disponible' && this.rol !== 'MEDICO' ?  [
                        {
                            label: 'Agendar',
                            icon: 'pi pi-fw pi-calendar-plus',
                            command: () => this.updateAppointment(appointment.id_cita)
                        }
                    ] : []),
                    ...(this.rol !== 'MEDICO' ? [{
                        label: 'Realizar Consulta',
                        icon: 'pi pi-fw pi-send',
                        command: () => this.openconsultationDialog(appointment.id_cita,appointment.medico_id)
                    }] : []),
                    {
                        label: 'Ver resultados de la consulta',
                        icon: 'pi pi-fw pi-send',
                        command: () => this.openDetailDialog(appointment.id_cita)
                    },
                    ...(this.rol == 'MEDICO' ? [{
                        label: 'Cancelar',
                        icon: 'pi pi-fw pi-calendar-minus',
                        command: () => this.cancelAppointment(appointment.id_cita)
                    }] : [])
                ]
            }));
    }

    cancelAppointment(appointmentId: number): void {
        this.clinicService.deleteAppointment(appointmentId).subscribe(
            () => {
                this.showAlert('success', 'Exitó', 'Cita cancelada con exito');
                this.loadAppointments();
            },
            error => {
                this.showAlert('error', 'Error', error);
            }
        );
    }

    openAppointmentDialog(medico_id: number): void {
        this.appointment = new Appointment();
        this.appointment.medico_id = medico_id;
        this.appointment.estado = "Disponible";
        this.appointment.fecha_creacion = new Date();
        this.appointment.usr_creacion = "asantillany"
        this.display = true;
    }

    openconsultationDialog(cita_id: string, medico_id): void {
        this.loadSintomas();
        this.newConsulta.medico_id = medico_id;
        this.newConsulta.cita_id = cita_id;
        this.modalConsulta = true;
    }

    openDetailDialog(cita_id: number): void {
        this.loadDetailConsultation(cita_id)
        this.modalResultado = true;
    }

    updateAppointment(cita_id: number): void {
        this.appointment = new Appointment();
        this.appointment.estado = "No Disponible";
        this.appointment.usuario_id = 1;
        this.appointment.fecha_modificacion = new Date();
        this.appointment.usr_modificacion = "asantillany";

        this.clinicService.updateAppointment(cita_id,this.appointment).subscribe(
            () => {
                this.showAlert('success', 'Actualización', 'Cita agendada  con exito');
                this.loadAppointments();
            },
            error => {
                this.showAlert('error', 'Error', error);
            }
        );
    }


    submitAppointment(): void {
        this.clinicService.createAppointment(this.appointment).subscribe(
            () => {
                this.showAlert('info', 'Creación', 'Cita creada con exito');
                this.display = false;
                this.loadAppointments();
            },
            error => {
                this.showAlert('error', 'Error', error);
                this.display = false;
            }
        );
    }

    submitConsultation(event): void {
        if (this.fileUpload && this.fileUpload.files.length > 0) {
            this.archivo = this.fileUpload.files[0];
        } else {
            this.showAlert('error', 'Error', 'Por favor, seleccione un archivo.');
            return;
        }

        const sintomasMapped = this.newConsulta.sintomas.map(sintoma => ({
            id_sintoma: sintoma.id_sintoma,
            descripcion: sintoma.descripcion
        }));

        const consultaToSend = {
            ...this.newConsulta,
            sintomas: sintomasMapped,
            usuario_id: this.id
        };

        this.clinicService.createConsultation(consultaToSend, this.archivo).subscribe(
            response => {
                this.showAlert('info', 'Éxito', 'Consulta realizada con éxito');
                this.modalConsulta = false;
            },
            error => {
                this.showAlert('error', 'Error', error);
            }
        );
        if (this.fileUpload) {
            this.fileUpload.clear();
        }
    }

    hideDialog(): void {
        this.display = false;
    }

    deleteFile(){
        this.fileUpload.clear();
    }
    hideDialogConsulta(): void {
        this.modalResultado = false;
        if (this.fileUpload) {
            this.fileUpload.clear();
        }
    }

    showAlert(severity: string, summary: string, detail: string): void {
        this.messageService.add({ key: 'tst', severity: severity, summary: summary, detail: detail });
    }
}
